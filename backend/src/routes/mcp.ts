import { Router } from "express";
import { callMcpTool, listMcpTools } from "../mcp/supabase-client.js";
import { listAirtableMcpTools, isAirtableMcpConfigured } from "../mcp/airtable-client.js";
import { listN8nMcpTools, isN8nMcpConfigured } from "../mcp/n8n-client.js";
import { listGmailMcpTools, isGmailMcpConfigured } from "../mcp/gmail-client.js";
import { logger } from "../lib/logger.js";
import { createUserSupabaseFromRequest } from "../services/auth-context.js";
import { getAirtableRuntimeAccess } from "../services/integrations/airtable.js";
import { getGmailAccessTokenForContext } from "../services/integrations/gmail.js";
import { getUserMcpConfig, upsertUserMcpConfig } from "../services/user-mcp-config.js";
import { parseBody, parseQuery } from "../validators/http.js";
import { mcpCallBodySchema, providerQuerySchema, userMcpConfigBodySchema } from "../validators/schemas.js";
import type { AuthRequest } from "../middleware/auth.js";

function normalizeTools(result: unknown): { name: string; description?: string }[] {
  const list = (result as { tools?: { name?: string; description?: string }[] })?.tools;
  if (!Array.isArray(list)) return [];
  return list.map((t) => ({ name: t?.name ?? "", description: t?.description }));
}

export function mcpRouter(): Router {
  const router = Router();

  router.get("/tools", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const userSupabase = createUserSupabaseFromRequest(req);
      const userConfig = await getUserMcpConfig(userSupabase, req.user.id);
      const { provider } = parseQuery(providerQuerySchema, req);
      if (provider === "airtable") {
        const runtime = await getAirtableRuntimeAccess({
          supabase: userSupabase,
          userId: req.user.id,
        });
        if (!isAirtableMcpConfigured(runtime.runtimeConfig)) {
          res.status(503).json({ error: "MCP Airtable non configuré", tools: [] });
          return;
        }
        if (!runtime.available) {
          res.status(403).json({ error: "Connectez Airtable pour lister les outils", tools: [] });
          return;
        }
        const result = await listAirtableMcpTools(runtime.accessToken, runtime.runtimeConfig);
        return res.json({ provider: "airtable", tools: normalizeTools(result) });
      }
      if (provider === "n8n") {
        const n8nRuntime = { url: userConfig.n8n?.mcpUrl, token: userConfig.n8n?.accessToken };
        if (!isN8nMcpConfigured(n8nRuntime)) {
          res.status(503).json({ error: "MCP n8n non configuré", tools: [] });
          return;
        }
        const result = await listN8nMcpTools(n8nRuntime);
        return res.json({ provider: "n8n", tools: normalizeTools(result) });
      }
      if (provider === "gmail") {
        if (!isGmailMcpConfigured()) {
          res.status(503).json({ error: "MCP Gmail non configuré", tools: [] });
          return;
        }
        const accessToken = await getGmailAccessTokenForContext({
          supabase: createUserSupabaseFromRequest(req),
          userId: req.user.id,
        });
        if (!accessToken) {
          res.status(403).json({ error: "Connectez Gmail pour lister les outils", tools: [] });
          return;
        }
        const result = await listGmailMcpTools(accessToken);
        return res.json({ provider: "gmail", tools: normalizeTools(result) });
      }
      res.status(400).json({ error: "Provider invalide", tools: [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur MCP";
      logger.error("mcp", "tools", err);
      res.status(502).json({ error: message, tools: [] });
    }
  });

  router.post("/call", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const userSupabase = createUserSupabaseFromRequest(req);
      const userConfig = await getUserMcpConfig(userSupabase, req.user.id);
      const supabaseRuntime = {
        url: userConfig.supabase?.mcpUrl,
        token: userConfig.supabase?.accessToken,
        projectRef: userConfig.supabase?.projectRef,
      };
      const { toolName, arguments: args } = parseBody(mcpCallBodySchema, req);
      if (toolName === "list_tools") {
        const result = await listMcpTools(supabaseRuntime);
        return res.json({
          tools: (result as { tools?: { name: string; description?: string }[] }).tools?.map((t) => ({ name: t.name, description: t.description })) ?? [],
        });
      }
      const result = await callMcpTool(toolName, args, supabaseRuntime);
      res.json({ content: (result as { content?: unknown }).content, isError: (result as { isError?: boolean }).isError });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur MCP";
      logger.error("mcp", "call", err);
      res.status(502).json({ error: message });
    }
  });

  router.get("/config", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const cfg = await getUserMcpConfig(createUserSupabaseFromRequest(req), req.user.id);
      return res.json({
        supabase: {
          mcpUrl: cfg.supabase?.mcpUrl ?? "",
          projectRef: cfg.supabase?.projectRef ?? "",
          hasAccessToken: !!cfg.supabase?.accessToken,
        },
        n8n: {
          mcpUrl: cfg.n8n?.mcpUrl ?? "",
          hasAccessToken: !!cfg.n8n?.accessToken,
        },
        airtable: {
          runtimeMode: cfg.airtable?.runtimeMode ?? "server-token",
          mcpUrl: cfg.airtable?.mcpUrl ?? "",
          hasServerToken: !!cfg.airtable?.serverToken,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur de lecture de configuration";
      return res.status(500).json({ error: message });
    }
  });

  router.put("/config", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const payload = parseBody(userMcpConfigBodySchema, req);
      await upsertUserMcpConfig(createUserSupabaseFromRequest(req), req.user.id, payload);
      return res.status(204).send();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur d'enregistrement";
      return res.status(400).json({ error: message });
    }
  });

  return router;
}
