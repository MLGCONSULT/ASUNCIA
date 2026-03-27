/**
 * Health checks pour chaque serveur MCP. Chaque outil (Airtable, Notion, n8n, Gmail) dépend d'un serveur MCP configuré (voir config/mcp.ts).
 */
import { Router } from "express";
import {
  isAirtableMcpConfigured,
  listAirtableMcpTools,
} from "../mcp/airtable-client.js";
import { listN8nMcpTools, isN8nMcpConfigured } from "../mcp/n8n-client.js";
import { isGmailMcpConfigured } from "../mcp/gmail-client.js";
import { hasGoogleOAuthConfig } from "../services/integrations/gmail.js";
import { isSupabaseMcpConfigured, listMcpTools, type SupabaseMcpRuntimeConfig } from "../mcp/supabase-client.js";
import type { AuthRequest } from "../middleware/auth.js";
import { createUserSupabaseFromRequest } from "../services/auth-context.js";
import { getAirtableRuntimeAccess } from "../services/integrations/airtable.js";
import { getUserMcpConfig } from "../services/user-mcp-config.js";

export function healthRouter(): Router {
  const router = Router();

  router.get("/mcp-supabase", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ ok: false, error: "Non authentifié" });
      return;
    }
    try {
      const cfg = await getUserMcpConfig(createUserSupabaseFromRequest(req), req.user.id);
      const runtime: SupabaseMcpRuntimeConfig = {
        url: cfg.supabase?.mcpUrl,
        token: cfg.supabase?.accessToken,
        projectRef: cfg.supabase?.projectRef,
      };
      if (!isSupabaseMcpConfigured(runtime)) {
        res.status(503).json({ ok: false, error: "Configuration MCP Supabase manquante dans votre compte." });
        return;
      }
      const tools = await listMcpTools(runtime);
      res.json({ ok: true, tools: (tools as { tools?: unknown[] }).tools ?? [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ ok: false, error: message });
    }
  });

  router.get("/mcp-airtable", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ ok: false, error: "Non authentifié" });
      return;
    }
    try {
      const runtime = await getAirtableRuntimeAccess({
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      });
      if (!isAirtableMcpConfigured(runtime.runtimeConfig)) {
        res.status(503).json({ ok: false, error: "Configuration MCP Airtable manquante dans votre compte." });
        return;
      }
      if (!runtime.available) {
        res.status(403).json({ ok: false, error: "Airtable non connecté pour cet utilisateur." });
        return;
      }
      const tools = await listAirtableMcpTools(runtime.accessToken, runtime.runtimeConfig);
      res.json({
        ok: true,
        mode: runtime.source,
        tools: (tools as { tools?: unknown[] }).tools ?? [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ ok: false, error: message });
    }
  });

  router.get("/mcp-n8n", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ ok: false, error: "Non authentifié" });
      return;
    }
    try {
      const cfg = await getUserMcpConfig(createUserSupabaseFromRequest(req), req.user.id);
      const runtime = { url: cfg.n8n?.mcpUrl, token: cfg.n8n?.accessToken };
      if (!isN8nMcpConfigured(runtime)) {
        res.status(503).json({ ok: false, error: "Configuration MCP n8n manquante dans votre compte." });
        return;
      }
      const tools = await listN8nMcpTools(runtime);
      res.json({ ok: true, tools: (tools as { tools?: unknown[] }).tools ?? [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ ok: false, error: message });
    }
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
