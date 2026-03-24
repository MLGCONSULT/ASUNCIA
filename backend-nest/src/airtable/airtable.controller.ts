import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import { callAirtableMcpTool, isAirtableMcpConfigured } from "../mcp/airtable-client";
import { mcpResultToText, parseMcpResultJson } from "../mcp/result";
import { MCP_ERROR_MESSAGES } from "../config/mcp";
import { createUserSupabaseFromRequest } from "../services/auth-context";
import {
  getAirtableConnectionStatus,
  getAirtableRuntimeAccess,
  type UserIntegrationContext,
} from "../services/integrations/airtable";

type AuthRequest = Request & { user?: { id: string } };

type AirtableBaseParams = { baseId: string };
type AirtableRecordParams = { baseId: string; tableId: string };
type AirtableRecordWithIdParams = { baseId: string; tableId: string; recordId: string };

type AirtableRecordsQuery = { maxRecords?: number };
type AirtableTablesQuery = { debug?: string };

type AirtableFieldsBody = Record<string, unknown>;

function collectArraysByKeys(data: unknown, keys: string[], depth = 0): unknown[][] {
  if (depth > 4 || !data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const arrays: unknown[][] = [];
  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) arrays.push(value);
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      arrays.push(...collectArraysByKeys(value, keys, depth + 1));
    }
  }
  return arrays;
}

function isObjectWithId(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string";
}

function normalizeNamedItems(rows: unknown[]): { id: string; name: string }[] {
  return rows
    .map((row) => {
      if (!isObjectWithId(row)) return null;
      const nameCandidates = [
        (row as { name?: unknown }).name,
        (row as { title?: unknown }).title,
        (row as { table_name?: unknown }).table_name,
      ];
      const name = nameCandidates.find((x) => typeof x === "string");
      return {
        id: row.id as string,
        name: (name as string) || "Sans nom",
      };
    })
    .filter((x): x is { id: string; name: string } => !!x);
}

function pickBestArray(data: unknown, keys: string[], requireId = false): unknown[] {
  if (Array.isArray(data)) {
    if (!requireId) return data;
    return data.some((x) => isObjectWithId(x)) ? data : [];
  }
  const candidates = collectArraysByKeys(data, keys);
  if (candidates.length === 0) return [];
  if (!requireId) return candidates[0];
  const withId = candidates.find((arr) => arr.some((x) => isObjectWithId(x)));
  return withId ?? candidates[0];
}

@Controller("airtable")
export class AirtableController {
  private async callAirtableWithArgVariants(
    toolName: string,
    argVariants: Record<string, unknown>[],
    accessToken?: string,
  ) {
    let lastError: unknown = null;
    for (const args of argVariants) {
      try {
        return await callAirtableMcpTool(toolName, args, accessToken);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError ?? new Error(`Aucune variante d'arguments compatible pour ${toolName}.`);
  }

  private getUserContext(req: AuthRequest): UserIntegrationContext {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    return {
      supabase: createUserSupabaseFromRequest(req),
      userId: req.user.id,
    };
  }

  @Get("bases")
  async listBases(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAirtableMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.airtable }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const ctx = this.getUserContext(req);
      const runtime = await getAirtableRuntimeAccess(ctx);
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez votre compte Airtable pour accéder aux bases." },
          HttpStatus.FORBIDDEN,
        );
      }
      const result = await callAirtableMcpTool("list_bases", {}, runtime.accessToken);
      const data = parseMcpResultJson(result);
      return {
        bases: normalizeNamedItems(pickBestArray(data, ["bases", "data", "items"], true)),
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("bases/:baseId/tables")
  async listTables(
    @Req() req: AuthRequest,
    @Param() params: AirtableBaseParams,
    @Query() query: AirtableTablesQuery,
  ) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAirtableMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.airtable }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { baseId } = params;
      const runtime = await getAirtableRuntimeAccess(this.getUserContext(req));
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez votre compte Airtable pour accéder aux tables." },
          HttpStatus.FORBIDDEN,
        );
      }
      const result = await this.callAirtableWithArgVariants(
        "list_tables",
        [{ base_id: baseId }, { baseId }, { id: baseId }],
        runtime.accessToken,
      );
      const data = parseMcpResultJson(result);
      const rawTables = pickBestArray(data, ["tables", "data", "items"], true);
      const tables = normalizeNamedItems(rawTables);
      const debugEnabled = query.debug === "1" || query.debug === "true";
      if (debugEnabled) {
        return {
          tables,
          _debug: {
            baseId,
            parsedKeys:
              data && typeof data === "object" && !Array.isArray(data)
                ? Object.keys(data as Record<string, unknown>)
                : [],
            normalizedCount: tables.length,
            rawCandidatesCount: rawTables.length,
            mcpTextPreview: mcpResultToText(result).slice(0, 1200),
          },
        };
      }
      return {
        tables,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("bases/:baseId/tables/:tableId/records")
  async listRecords(
    @Req() req: AuthRequest,
    @Param() params: AirtableRecordParams,
    @Query() query: AirtableRecordsQuery,
  ) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAirtableMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.airtable }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { baseId, tableId } = params;
      const { maxRecords } = query;
      const runtime = await getAirtableRuntimeAccess(this.getUserContext(req));
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez votre compte Airtable pour accéder aux enregistrements." },
          HttpStatus.FORBIDDEN,
        );
      }
      const result = await this.callAirtableWithArgVariants(
        "list_records",
        [
          { base_id: baseId, table_id: tableId, max_records: maxRecords },
          { baseId, tableId, maxRecords },
          { base_id: baseId, tableId, maxRecords },
          { baseId, table_id: tableId, max_records: maxRecords },
        ],
        runtime.accessToken,
      );
      const data = parseMcpResultJson(result);
      return {
        records: pickBestArray(data, ["records", "data", "items"]),
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("bases/:baseId/tables/:tableId/records")
  async createRecord(
    @Req() req: AuthRequest,
    @Param() params: AirtableRecordParams,
    @Body() fields: AirtableFieldsBody,
  ) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAirtableMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.airtable }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { baseId, tableId } = params;
      const runtime = await getAirtableRuntimeAccess(this.getUserContext(req));
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez votre compte Airtable pour créer des enregistrements." },
          HttpStatus.FORBIDDEN,
        );
      }
      const result = await this.callAirtableWithArgVariants(
        "create_record",
        [
          { base_id: baseId, table_id: tableId, fields },
          { baseId, tableId, fields },
          { base_id: baseId, tableId, fields },
          { baseId, table_id: tableId, fields },
        ],
        runtime.accessToken,
      );
      return parseMcpResultJson(result);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Patch("bases/:baseId/tables/:tableId/records/:recordId")
  async updateRecord(
    @Req() req: AuthRequest,
    @Param() params: AirtableRecordWithIdParams,
    @Body() fields: AirtableFieldsBody,
  ) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAirtableMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.airtable }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { baseId, tableId, recordId } = params;
      const runtime = await getAirtableRuntimeAccess(this.getUserContext(req));
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez votre compte Airtable pour modifier des enregistrements." },
          HttpStatus.FORBIDDEN,
        );
      }
      const result = await this.callAirtableWithArgVariants(
        "update_records",
        [
          {
            base_id: baseId,
            table_id: tableId,
            records: [{ id: recordId, fields }],
          },
          {
            baseId,
            tableId,
            records: [{ id: recordId, fields }],
          },
        ],
        runtime.accessToken,
      );
      return parseMcpResultJson(result);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("status")
  async status(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    try {
      const status = await getAirtableConnectionStatus(this.getUserContext(req));
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

