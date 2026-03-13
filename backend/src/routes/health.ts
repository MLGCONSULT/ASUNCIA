/**
 * Health checks pour chaque serveur MCP. Chaque outil (Airtable, Notion, n8n, Gmail) dépend d'un serveur MCP configuré (voir config/mcp.ts).
 */
import { Router } from "express";
import {
  hasAirtableServerToken,
  getAirtableRuntimeMode,
  isAirtableMcpConfigured,
  isAirtableOAuthConfigured,
  listAirtableMcpTools,
} from "../mcp/airtable-client.js";
import { listN8nMcpTools, isN8nMcpConfigured } from "../mcp/n8n-client.js";
import {
  hasNotionEnvToken,
  getNotionRuntimeMode,
  hasNotionOAuthConfig,
  isNotionMcpConfigured,
  listNotionMcpTools,
} from "../mcp/notion-client.js";
import { isGmailMcpConfigured } from "../mcp/gmail-client.js";
import { hasGoogleOAuthConfig } from "../services/integrations/gmail.js";
import { isSupabaseMcpConfigured, listMcpTools } from "../mcp/supabase-client.js";

export function healthRouter(): Router {
  const router = Router();

  router.get("/mcp-supabase", async (_req, res) => {
    if (!isSupabaseMcpConfigured()) {
      res.status(503).json({ ok: false, error: "SUPABASE_ACCESS_TOKEN ou SUPABASE_PROJECT_REF/NEXT_PUBLIC_SUPABASE_URL manquant" });
      return;
    }
    try {
      const tools = await listMcpTools();
      res.json({ ok: true, tools: (tools as { tools?: unknown[] }).tools ?? [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ ok: false, error: message });
    }
  });

  router.get("/mcp-airtable", async (_req, res) => {
    if (!isAirtableMcpConfigured()) {
      res.status(503).json({ ok: false, error: "AIRTABLE_MCP_URL et un mode d'auth Airtable sont requis" });
      return;
    }
    if (!hasAirtableServerToken() && isAirtableOAuthConfigured()) {
      res.json({
        ok: true,
        selectedMode: getAirtableRuntimeMode(),
        mode: "oauth",
        requiresUserConnection: true,
        message: "Airtable MCP configuré en OAuth. Connectez un utilisateur pour vérifier les outils.",
      });
      return;
    }
    try {
      const tools = await listAirtableMcpTools();
      res.json({
        ok: true,
        selectedMode: getAirtableRuntimeMode(),
        mode: hasAirtableServerToken() ? "server-token" : "oauth",
        tools: (tools as { tools?: unknown[] }).tools ?? [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ ok: false, error: message });
    }
  });

  router.get("/mcp-n8n", async (_req, res) => {
    if (!isN8nMcpConfigured()) {
      res.status(503).json({ ok: false, error: "N8N_MCP_URL ou N8N_MCP_ACCESS_TOKEN manquant" });
      return;
    }
    try {
      const tools = await listN8nMcpTools();
      res.json({ ok: true, tools: (tools as { tools?: unknown[] }).tools ?? [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ ok: false, error: message });
    }
  });

  router.get("/mcp-notion", async (_req, res) => {
    if (!isNotionMcpConfigured()) {
      res.status(503).json({ ok: false, error: "Notion MCP non configuré" });
      return;
    }
    if (hasNotionEnvToken()) {
      try {
        const tools = await listNotionMcpTools();
        res.json({
          ok: true,
          selectedMode: getNotionRuntimeMode(),
          mode: "server-token",
          tools: (tools as { tools?: unknown[] }).tools ?? [],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(502).json({ ok: false, error: message });
      }
      return;
    }
    res.json({
      ok: hasNotionOAuthConfig(),
      selectedMode: getNotionRuntimeMode(),
      mode: "oauth",
      requiresUserConnection: true,
      message: hasNotionOAuthConfig()
        ? "Notion MCP configuré en OAuth. Connectez un utilisateur pour vérifier les outils."
        : "NOTION_OAUTH_REDIRECT_URI manquant pour le mode OAuth.",
    });
  });

  router.get("/mcp-gmail", (_req, res) => {
    if (!isGmailMcpConfigured()) {
      res.status(503).json({ ok: false, error: "GMAIL_MCP_URL manquant" });
      return;
    }
    res.json({
      ok: hasGoogleOAuthConfig(),
      mode: "oauth",
      selectedMode: "read-send",
      capabilities: ["read_messages", "send_email"],
      requiresUserConnection: true,
      oauthConfigured: hasGoogleOAuthConfig(),
      message: hasGoogleOAuthConfig()
        ? "Gmail MCP et OAuth Google configurés. Connectez un utilisateur pour vérifier les outils."
        : "GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET manquant.",
    });
  });

  return router;
}
