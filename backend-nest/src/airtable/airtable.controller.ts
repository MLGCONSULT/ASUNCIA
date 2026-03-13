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
import { parseMcpResultJson } from "../mcp/result";
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

type AirtableFieldsBody = Record<string, unknown>;

@Controller("airtable")
export class AirtableController {
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
      const data = parseMcpResultJson<{ bases?: { id: string; name: string }[] }>(result);
      return {
        bases: Array.isArray(data.bases) ? data.bases : (data as { bases?: unknown }).bases ?? [],
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("bases/:baseId/tables")
  async listTables(@Req() req: AuthRequest, @Param() params: AirtableBaseParams) {
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
      const result = await callAirtableMcpTool("list_tables", { base_id: baseId }, runtime.accessToken);
      const data = parseMcpResultJson<{ tables?: { id: string; name: string }[] }>(result);
      return {
        tables: Array.isArray(data.tables) ? data.tables : (data as { tables?: unknown }).tables ?? [],
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
      const result = await callAirtableMcpTool(
        "list_records",
        { base_id: baseId, table_id: tableId, max_records: maxRecords },
        runtime.accessToken,
      );
      const data = parseMcpResultJson<{ records?: { id: string; fields: Record<string, unknown> }[] }>(result);
      return {
        records: Array.isArray(data.records)
          ? data.records
          : (data as { records?: unknown }).records ?? [],
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
      const result = await callAirtableMcpTool(
        "create_record",
        { base_id: baseId, table_id: tableId, fields },
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
      const result = await callAirtableMcpTool(
        "update_records",
        {
          base_id: baseId,
          table_id: tableId,
          records: [{ id: recordId, fields }],
        },
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

