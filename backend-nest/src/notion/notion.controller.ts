import {
  Controller,
  Get,
  Query,
  Param,
  Req,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import {
  callNotionMcpTool,
  getNotionMcpToolNames,
  isNotionMcpConfigured,
} from "../mcp/notion-client";
import { parseMcpResultJson } from "../mcp/result";
import { MCP_ERROR_MESSAGES } from "../config/mcp";
import { createUserSupabaseFromRequest } from "../services/auth-context";
import {
  getNotionConnectionStatus,
  getNotionRuntimeAccess,
  type UserIntegrationContext,
} from "../services/integrations/notion";

type AuthRequest = Request & { user?: { id: string } };

type NotionSearchQuery = {
  filterType?: string;
  query?: string;
};

type NotionDatabaseParams = {
  databaseId: string;
};

type NotionDatabaseQuery = {
  pageSize?: number;
};

type NormalizedItem = { id: string; title: string; url?: string; lastEdited?: string };

function extractTitle(obj: Record<string, unknown>): string {
  const props = obj.properties as Record<string, unknown> | undefined;
  const titleProp = props?.title ?? props?.Title;
  const titleArr = (titleProp as { title?: { plain_text?: string }[] })?.title;
  const fromProps =
    titleArr?.[0] && typeof titleArr[0] === "object" && titleArr[0] !== null && "plain_text" in titleArr[0]
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
  return results
    .map((r) => {
      if (!r || typeof r !== "object")
        return { id: "", title: "Sans titre", url: undefined, lastEdited: undefined };
      const obj = r as Record<string, unknown>;
      const id = typeof obj.id === "string" ? obj.id : "";
      const url = typeof obj.url === "string" ? obj.url : undefined;
      const lastEdited = typeof obj.last_edited_time === "string" ? obj.last_edited_time : undefined;
      const title = extractTitle(obj);
      return { id, title, url, lastEdited };
    })
    .filter((x) => x.id);
}

@Controller("notion")
export class NotionController {
  private getUserContext(req: AuthRequest): UserIntegrationContext {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    return {
      supabase: createUserSupabaseFromRequest(req),
      userId: req.user.id,
    };
  }

  @Get("search")
  async search(@Req() req: AuthRequest, @Query() query: NotionSearchQuery) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isNotionMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.notion }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const runtime = await getNotionRuntimeAccess(this.getUserContext(req));
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez Notion depuis les paramètres (OAuth)." },
          HttpStatus.FORBIDDEN,
        );
      }
      const { search: searchTool } = getNotionMcpToolNames();
      const { filterType, query: q = "" } = query;
      const args =
        searchTool === "notion-search"
          ? { query: q.length > 0 ? q : " ", ...(filterType && { filter_type: filterType }) }
          : filterType
            ? { filter_type: filterType }
            : {};
      const result = await callNotionMcpTool(searchTool, args, runtime.accessToken);
      const data = parseMcpResultJson<{ results?: unknown[]; databases?: unknown[]; pages?: unknown[] }>(result);
      if (Array.isArray(data.results) && data.results.length >= 0) {
        const { databases, pages } = normalizeSearchResults(data.results);
        return { databases, pages };
      }
      if (data.databases !== undefined || data.pages !== undefined) {
        const dbs = Array.isArray(data.databases)
          ? (data.databases as Record<string, unknown>[]).map((obj) => ({
              id: typeof obj.id === "string" ? obj.id : "",
              title: extractTitle(obj),
              url: typeof obj.url === "string" ? obj.url : undefined,
              lastEdited: typeof obj.last_edited_time === "string" ? obj.last_edited_time : undefined,
            }))
              .filter((x) => x.id)
          : [];
        const pgs = Array.isArray(data.pages)
          ? (data.pages as Record<string, unknown>[]).map((obj) => ({
              id: typeof obj.id === "string" ? obj.id : "",
              title: extractTitle(obj),
              url: typeof obj.url === "string" ? obj.url : undefined,
              lastEdited: typeof obj.last_edited_time === "string" ? obj.last_edited_time : undefined,
            }))
              .filter((x) => x.id)
          : [];
        return { databases: dbs, pages: pgs };
      }
      return { databases: [], pages: [] };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const raw = err instanceof Error ? err.message : String(err);
      const isToolNotFound = /not found|Tool\s+\w+\s+not/i.test(raw);
      const message = isToolNotFound
        ? "Le serveur MCP a répondu : outil introuvable. Vérifiez que NOTION_MCP_URL pointe bien vers le serveur Notion MCP (et non vers n8n ou un autre service)."
        : raw;
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("databases/:databaseId/query")
  async queryDatabase(
    @Req() req: AuthRequest,
    @Param() params: NotionDatabaseParams,
    @Query() query: NotionDatabaseQuery,
  ) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isNotionMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.notion }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const runtime = await getNotionRuntimeAccess(this.getUserContext(req));
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez Notion depuis les paramètres (OAuth)." },
          HttpStatus.FORBIDDEN,
        );
      }
      const { databaseId } = params;
      const { pageSize } = query;
      const { queryDatabase: queryTool } = getNotionMcpToolNames();
      const result = await callNotionMcpTool(
        queryTool,
        queryTool === "query-data-source"
          ? { data_source_id: databaseId, page_size: pageSize }
          : { database_id: databaseId, page_size: pageSize },
        runtime.accessToken,
      );
      const data = parseMcpResultJson<{ results?: unknown[] }>(result);
      const resultsValue = Array.isArray(data.results) ? data.results : (data as { results?: unknown }).results;
      const raw = Array.isArray(resultsValue) ? resultsValue : [];
      const results = normalizeQueryResults(raw);
      return results;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const raw = err instanceof Error ? err.message : String(err);
      const isToolNotFound = /not found|Tool\s+\w+\s+not/i.test(raw);
      const message = isToolNotFound
        ? "Le serveur MCP a répondu : outil introuvable. Vérifiez que NOTION_MCP_URL pointe bien vers le serveur Notion MCP (et non vers n8n ou un autre service)."
        : raw;
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("status")
  async status(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    try {
      const status = await getNotionConnectionStatus(this.getUserContext(req));
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Notion";
      throw new HttpException({ error: message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

