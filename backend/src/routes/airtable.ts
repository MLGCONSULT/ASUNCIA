import { Router } from "express";
import { callAirtableMcpTool, isAirtableMcpConfigured } from "../mcp/airtable-client.js";
import { parseMcpResultJson } from "../mcp/result.js";
import { MCP_ERROR_MESSAGES } from "../config/mcp.js";
import { logger } from "../lib/logger.js";
import { createUserSupabaseFromRequest } from "../services/auth-context.js";
import {
  getAirtableConnectionStatus,
  getAirtableRuntimeAccess,
  type UserIntegrationContext,
} from "../services/integrations/airtable.js";
import { parseBody, parseParams, parseQuery } from "../validators/http.js";
import {
  airtableBaseParamsSchema,
  airtableFieldsBodySchema,
  airtableRecordParamsSchema,
  airtableRecordsQuerySchema,
  airtableRecordWithIdParamsSchema,
} from "../validators/schemas.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function getAirtableAccessTokenForUser(req: AuthRequest): Promise<string | null> {
  if (!req.user) return null;
  const runtime = await getAirtableRuntimeAccess({
    supabase: createUserSupabaseFromRequest(req),
    userId: req.user.id,
  });
  return runtime.available ? runtime.accessToken ?? null : null;
}

export function airtableRouter(): Router {
  const router = Router();

  router.get("/bases", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const ctx: UserIntegrationContext = {
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      };
      const runtime = await getAirtableRuntimeAccess(ctx);
      if (!isAirtableMcpConfigured(runtime.runtimeConfig)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.airtable });
        return;
      }
      if (!runtime.available) {
        res.status(403).json({ error: "Connectez votre compte Airtable pour accéder aux bases." });
        return;
      }
      const result = await callAirtableMcpTool("list_bases", {}, runtime.accessToken, runtime.runtimeConfig);
      const data = parseMcpResultJson<{ bases?: { id: string; name: string }[] }>(result);
      return res.json({ bases: Array.isArray(data.bases) ? data.bases : (data as { bases?: unknown }).bases ?? [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      logger.error("airtable", "bases", err);
      res.status(502).json({ error: message });
    }
  });

  router.get("/bases/:baseId/tables", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const { baseId } = parseParams(airtableBaseParamsSchema, req);
      const runtime = await getAirtableRuntimeAccess({
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      });
      if (!isAirtableMcpConfigured(runtime.runtimeConfig)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.airtable });
        return;
      }
      if (!runtime.available) {
        res.status(403).json({ error: "Connectez votre compte Airtable pour accéder aux tables." });
        return;
      }
      const result = await callAirtableMcpTool("list_tables", { base_id: baseId }, runtime.accessToken, runtime.runtimeConfig);
      const data = parseMcpResultJson<{ tables?: { id: string; name: string }[] }>(result);
      return res.json({ tables: Array.isArray(data.tables) ? data.tables : (data as { tables?: unknown }).tables ?? [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      logger.error("airtable", "tables", err);
      res.status(502).json({ error: message });
    }
  });

  router.get("/bases/:baseId/tables/:tableId/records", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const { baseId, tableId } = parseParams(airtableRecordParamsSchema, req);
      const { maxRecords } = parseQuery(airtableRecordsQuerySchema, req);
      const runtime = await getAirtableRuntimeAccess({
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      });
      if (!isAirtableMcpConfigured(runtime.runtimeConfig)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.airtable });
        return;
      }
      if (!runtime.available) {
        res.status(403).json({ error: "Connectez votre compte Airtable pour accéder aux enregistrements." });
        return;
      }
      const result = await callAirtableMcpTool(
        "list_records",
        { base_id: baseId, table_id: tableId, max_records: maxRecords },
        runtime.accessToken,
        runtime.runtimeConfig
      );
      const data = parseMcpResultJson<{ records?: { id: string; fields: Record<string, unknown> }[] }>(result);
      return res.json({ records: Array.isArray(data.records) ? data.records : (data as { records?: unknown }).records ?? [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      logger.error("airtable", "records", err);
      res.status(502).json({ error: message });
    }
  });

  router.post("/bases/:baseId/tables/:tableId/records", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const { baseId, tableId } = parseParams(airtableRecordParamsSchema, req);
      const fields = parseBody(airtableFieldsBodySchema, req);
      const runtime = await getAirtableRuntimeAccess({
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      });
      if (!isAirtableMcpConfigured(runtime.runtimeConfig)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.airtable });
        return;
      }
      if (!runtime.available) {
        res.status(403).json({ error: "Connectez votre compte Airtable pour créer des enregistrements." });
        return;
      }
      const result = await callAirtableMcpTool(
        "create_record",
        { base_id: baseId, table_id: tableId, fields },
        runtime.accessToken,
        runtime.runtimeConfig
      );
      const data = parseMcpResultJson(result);
      return res.status(201).json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      logger.error("airtable", "create_record", err);
      res.status(502).json({ error: message });
    }
  });

  router.patch("/bases/:baseId/tables/:tableId/records/:recordId", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const { baseId, tableId, recordId } = parseParams(airtableRecordWithIdParamsSchema, req);
      const fields = parseBody(airtableFieldsBodySchema, req);
      const runtime = await getAirtableRuntimeAccess({
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      });
      if (!isAirtableMcpConfigured(runtime.runtimeConfig)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.airtable });
        return;
      }
      if (!runtime.available) {
        res.status(403).json({ error: "Connectez votre compte Airtable pour modifier des enregistrements." });
        return;
      }
      const result = await callAirtableMcpTool(
        "update_records",
        {
          base_id: baseId,
          table_id: tableId,
          records: [{ id: recordId, fields }],
        },
        runtime.accessToken,
        runtime.runtimeConfig
      );
      const data = parseMcpResultJson(result);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      logger.error("airtable", "update_records", err);
      res.status(502).json({ error: message });
    }
  });

  router.get("/status", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const status = await getAirtableConnectionStatus({
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      });
      res.json(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
