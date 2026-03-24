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
import {
  callAirtableMcpTool,
  isAirtableMcpConfigured,
  listAirtableMcpTools,
} from "../mcp/airtable-client";
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

function flattenObjectArrays(data: unknown, depth = 0): unknown[] {
  if (depth > 5 || !data || typeof data !== "object") return [];
  const out: unknown[] = [];
  if (Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) out.push(...value);
    else if (value && typeof value === "object") out.push(...flattenObjectArrays(value, depth + 1));
  }
  return out;
}

function normalizeTablesFromUnknown(data: unknown): { id: string; name: string }[] {
  const directRows = pickBestArray(data, ["tables", "data", "items"], true);
  const direct = directRows
    .map((row) => {
      if (!isObjectWithId(row)) return null;
      const nameCandidates = [
        (row as { name?: unknown }).name,
        (row as { title?: unknown }).title,
        (row as { table_name?: unknown }).table_name,
      ];
      const name = nameCandidates.find((x) => typeof x === "string");
      const fieldsRaw = (row as { fields?: unknown }).fields;
      const fields = Array.isArray(fieldsRaw)
        ? fieldsRaw
            .map((f) => {
              if (!f || typeof f !== "object") return null;
              const obj = f as Record<string, unknown>;
              const id = typeof obj.id === "string" ? obj.id : "";
              const fieldName = typeof obj.name === "string" ? obj.name : "";
              const type = typeof obj.type === "string" ? obj.type : "";
              if (!id || !fieldName) return null;
              return { id, name: fieldName, type };
            })
            .filter((x): x is { id: string; name: string; type?: string } => !!x)
        : [];
      return {
        id: row.id as string,
        name: (name as string) || "Sans nom",
        fields,
      };
    })
    .filter((x): x is { id: string; name: string; fields?: { id: string; name: string; type?: string }[] } => !!x);
  if (direct.length > 0) return direct;

  const deepRows = flattenObjectArrays(data).filter((x) => isObjectWithId(x));
  return normalizeNamedItems(deepRows);
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

  private async listTablesWithToolFallback(baseId: string, accessToken?: string) {
    const attempts: Array<{ tool: string; args: Record<string, unknown> }> = [
      { tool: "list_tables_for_base", args: { baseId } },
      { tool: "list_tables", args: { base_id: baseId } },
      { tool: "list_tables", args: { baseId } },
      { tool: "list_tables", args: { id: baseId } },
      { tool: "get_base_schema", args: { base_id: baseId } },
      { tool: "get_base_schema", args: { baseId } },
      { tool: "describe_base", args: { base_id: baseId } },
      { tool: "describe_base", args: { baseId } },
    ];

    let availableTools: string[] = [];
    try {
      const list = await listAirtableMcpTools(accessToken);
      availableTools = Array.isArray((list as { tools?: unknown[] }).tools)
        ? ((list as { tools: Array<{ name?: string }> }).tools
            .map((t) => (typeof t?.name === "string" ? t.name : ""))
            .filter(Boolean) as string[])
        : [];
    } catch {
      // ignore listTools failures, we'll still try defaults
    }

    const filteredAttempts =
      availableTools.length > 0
        ? attempts.filter((a) => availableTools.includes(a.tool))
        : attempts;
    const finalAttempts = filteredAttempts.length > 0 ? filteredAttempts : attempts;

    let lastError: unknown = null;
    for (const attempt of finalAttempts) {
      try {
        const result = await callAirtableMcpTool(attempt.tool, attempt.args, accessToken);
        const data = parseMcpResultJson(result);
        const tables = normalizeTablesFromUnknown(data);
        if (tables.length > 0) {
          return { tables, data, usedTool: attempt.tool, availableTools };
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (lastError) throw lastError;
    return { tables: [], data: {}, usedTool: "none", availableTools };
  }

  private async listRecordsWithToolFallback(
    baseId: string,
    tableId: string,
    maxRecords: number | undefined,
    accessToken?: string,
  ): Promise<unknown[]> {
    const attempts: Array<{ tool: string; args: Record<string, unknown> }> = [
      {
        tool: "list_records_for_table",
        args: { baseId, tableId, ...(maxRecords ? { pageSize: maxRecords } : {}) },
      },
      {
        tool: "list_records",
        args: { base_id: baseId, table_id: tableId, max_records: maxRecords },
      },
      { tool: "list_records", args: { baseId, tableId, maxRecords } },
      { tool: "list_records", args: { base_id: baseId, tableId, maxRecords } },
      {
        tool: "list_records",
        args: { baseId, table_id: tableId, max_records: maxRecords },
      },
    ];

    let availableTools: string[] = [];
    try {
      const list = await listAirtableMcpTools(accessToken);
      availableTools = Array.isArray((list as { tools?: unknown[] }).tools)
        ? ((list as { tools: Array<{ name?: string }> }).tools
            .map((t) => (typeof t?.name === "string" ? t.name : ""))
            .filter(Boolean) as string[])
        : [];
    } catch {
      // ignore
    }

    const filteredAttempts =
      availableTools.length > 0
        ? attempts.filter((a) => availableTools.includes(a.tool))
        : attempts;
    const finalAttempts = filteredAttempts.length > 0 ? filteredAttempts : attempts;

    let lastError: unknown = null;
    for (const attempt of finalAttempts) {
      try {
        const result = await callAirtableMcpTool(attempt.tool, attempt.args, accessToken);
        const data = parseMcpResultJson(result);
        const fromStandard = pickBestArray(data, ["records", "data", "items"]);
        if (fromStandard.length > 0) return fromStandard;

        const special = (data as { records?: unknown[] }).records;
        if (Array.isArray(special) && special.length > 0) {
          return special.map((r) => {
            if (!r || typeof r !== "object") return r;
            const row = r as Record<string, unknown>;
            const fields =
              row.cellValuesByFieldId && typeof row.cellValuesByFieldId === "object"
                ? row.cellValuesByFieldId
                : row.fields;
            return {
              id: row.id,
              createdTime: row.createdTime,
              fields: fields ?? {},
            };
          });
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (lastError) throw lastError;
    return [];
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
      const { tables, data, usedTool, availableTools } = await this.listTablesWithToolFallback(
        baseId,
        runtime.accessToken,
      );
      const debugEnabled = query.debug === "1" || query.debug === "true";
      if (debugEnabled) {
        return {
          tables,
          _debug: {
            baseId,
            usedTool,
            availableTools,
            parsedKeys:
              data && typeof data === "object" && !Array.isArray(data)
                ? Object.keys(data as Record<string, unknown>)
                : [],
            normalizedCount: tables.length,
            mcpTextPreview: JSON.stringify(data).slice(0, 1200),
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
      const data = await this.listRecordsWithToolFallback(
        baseId,
        tableId,
        maxRecords,
        runtime.accessToken,
      );
      return {
        records: Array.isArray(data) ? data : [],
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

