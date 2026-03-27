import { Router } from "express";
import { callNotionMcpTool, isNotionMcpConfigured, getNotionMcpToolNames } from "../mcp/notion-client.js";
import { parseMcpResultJson } from "../mcp/result.js";
import { MCP_ERROR_MESSAGES } from "../config/mcp.js";
import { createUserSupabaseFromRequest } from "../services/auth-context.js";
import {
  getNotionConnectionStatus,
  getNotionRuntimeAccess,
  type UserIntegrationContext,
} from "../services/integrations/notion.js";
import { parseParams, parseQuery } from "../validators/http.js";
import {
  notionDatabaseParamsSchema,
  notionDatabaseQuerySchema,
  notionSearchQuerySchema,
} from "../validators/schemas.js";
import type { AuthRequest } from "../middleware/auth.js";

type NormalizedItem = { id: string; title: string; url?: string; lastEdited?: string };

function extractTitle(obj: Record<string, unknown>): string {
  const props = obj.properties as Record<string, unknown> | undefined;
  const titleProp = props?.title ?? props?.Title;
  const titleArr = (titleProp as { title?: { plain_text?: string }[] })?.title;
  const fromProps = titleArr?.[0] && typeof titleArr[0] === "object" && titleArr[0] !== null && "plain_text" in titleArr[0]
    ? (titleArr[0] as { plain_text?: string }).plain_text
    : undefined;
  if (typeof fromProps === "string" && fromProps.length > 0) return fromProps;
  const fromTitle = (obj.title as { plain_text?: string }[])?.[0]?.plain_text;
  if (typeof fromTitle === "string" && fromTitle.length > 0) return fromTitle;
  return (obj as { name?: string }).name ?? "Sans titre";
}

function normalizeSearchResults(results: unknown[]): { databases: NormalizedItem[]; pages: NormalizedItem[] } {
  const databases: NormalizedItem[] = [];
  const pages: NormalizedItem[] = [];
  for (const r of results) {
    if (!r || typeof r !== "object") continue;
    const obj = r as Record<string, unknown>;
    const id = typeof obj.id === "string" ? obj.id : "";
    const url = typeof obj.url === "string" ? obj.url : undefined;
    const lastEdited = typeof obj.last_edited_time === "string" ? obj.last_edited_time : undefined;
    const title = extractTitle(obj);
    const item: NormalizedItem = { id, title, url, lastEdited };
    if (obj.object === "data_source" || obj.object === "database") {
      databases.push(item);
    } else {
      pages.push(item);
    }
  }
  return { databases, pages };
}

function normalizeQueryResults(results: unknown[]): NormalizedItem[] {
  return results.map((r) => {
    if (!r || typeof r !== "object") return { id: "", title: "Sans titre", url: undefined, lastEdited: undefined };
    const obj = r as Record<string, unknown>;
    const id = typeof obj.id === "string" ? obj.id : "";
    const url = typeof obj.url === "string" ? obj.url : undefined;
    const lastEdited = typeof obj.last_edited_time === "string" ? obj.last_edited_time : undefined;
    const title = extractTitle(obj);
    return { id, title, url, lastEdited };
  }).filter((x) => x.id);
}

export async function getNotionAccessTokenForUser(req: AuthRequest): Promise<string | null> {
  if (!req.user) return null;
  const runtime = await getNotionRuntimeAccess({
    supabase: createUserSupabaseFromRequest(req),
    userId: req.user.id,
  });
  return runtime.available ? runtime.accessToken ?? null : null;
}

export function notionRouter(): Router {
  const router = Router();

  router.get("/search", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const runtime = await getNotionRuntimeAccess({
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      });
      if (!isNotionMcpConfigured(runtime.runtimeConfig)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.notion });
        return;
      }
      if (!runtime.available) {
        res.status(403).json({ error: "Connectez Notion depuis les paramètres (OAuth)." });
        return;
      }
      const { search: searchTool } = getNotionMcpToolNames(runtime.runtimeConfig);
      const { filterType, query = "" } = parseQuery(notionSearchQuerySchema, req);
      const args =
        searchTool === "notion-search"
          ? { query: query.length > 0 ? query : " ", ...(filterType && { filter_type: filterType }) }
          : filterType ? { filter_type: filterType } : {};
      const result = await callNotionMcpTool(searchTool, args, runtime.accessToken, runtime.runtimeConfig);
      const data = parseMcpResultJson<{ results?: unknown[]; databases?: unknown[]; pages?: unknown[] }>(result);
      if (Array.isArray(data.results) && data.results.length >= 0) {
        const { databases, pages } = normalizeSearchResults(data.results);
        return res.json({ databases, pages });
      }
      if (data.databases !== undefined || data.pages !== undefined) {
        const dbs = Array.isArray(data.databases)
          ? (data.databases as Record<string, unknown>[]).map((obj) => ({
              id: typeof obj.id === "string" ? obj.id : "",
              title: extractTitle(obj),
              url: typeof obj.url === "string" ? obj.url : undefined,
              lastEdited: typeof obj.last_edited_time === "string" ? obj.last_edited_time : undefined,
            })).filter((x) => x.id)
          : [];
        const pgs = Array.isArray(data.pages)
          ? (data.pages as Record<string, unknown>[]).map((obj) => ({
              id: typeof obj.id === "string" ? obj.id : "",
              title: extractTitle(obj),
              url: typeof obj.url === "string" ? obj.url : undefined,
              lastEdited: typeof obj.last_edited_time === "string" ? obj.last_edited_time : undefined,
            })).filter((x) => x.id)
          : [];
        return res.json({ databases: dbs, pages: pgs });
      }
      return res.json({ databases: [], pages: [] });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const isToolNotFound = /not found|Tool\s+\w+\s+not/i.test(raw);
      const message = isToolNotFound
        ? "Le serveur MCP a répondu : outil introuvable. Vérifiez que NOTION_MCP_URL pointe bien vers le serveur Notion MCP (et non vers n8n ou un autre service)."
        : raw;
      res.status(502).json({ error: message });
    }
  });

  router.get("/databases/:databaseId/query", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const runtime = await getNotionRuntimeAccess({
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      });
      if (!isNotionMcpConfigured(runtime.runtimeConfig)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.notion });
        return;
      }
      if (!runtime.available) {
        res.status(403).json({ error: "Connectez Notion depuis les paramètres (OAuth)." });
        return;
      }
      const { databaseId } = parseParams(notionDatabaseParamsSchema, req);
      const { pageSize } = parseQuery(notionDatabaseQuerySchema, req);
      const { queryDatabase: queryTool } = getNotionMcpToolNames(runtime.runtimeConfig);
      const result = await callNotionMcpTool(
        queryTool,
        queryTool === "query-data-source"
          ? { data_source_id: databaseId, page_size: pageSize }
          : { database_id: databaseId, page_size: pageSize },
        runtime.accessToken,
        runtime.runtimeConfig
      );
      const data = parseMcpResultJson<{ results?: unknown[] }>(result);
      const resultsValue = Array.isArray(data.results) ? data.results : (data as { results?: unknown }).results;
      const raw = Array.isArray(resultsValue) ? resultsValue : [];
      const results = normalizeQueryResults(raw);
      return res.json(results);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const isToolNotFound = /not found|Tool\s+\w+\s+not/i.test(raw);
      const message = isToolNotFound
        ? "Le serveur MCP a répondu : outil introuvable. Vérifiez que NOTION_MCP_URL pointe bien vers le serveur Notion MCP (et non vers n8n ou un autre service)."
        : raw;
      res.status(502).json({ error: message });
    }
  });

  router.get("/status", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const status = await getNotionConnectionStatus({
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      });
      res.json(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Notion";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
