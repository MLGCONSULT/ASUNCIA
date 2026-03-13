import { Router } from "express";
import { callGmailMcpTool, isGmailMcpConfigured } from "../mcp/gmail-client.js";
import { parseMcpResultJson } from "../mcp/result.js";
import { MCP_ERROR_MESSAGES } from "../config/mcp.js";
import { createUserSupabaseFromRequest } from "../services/auth-context.js";
import {
  getGmailAccessTokenForContext,
  getGmailConnectionStatus,
  type UserIntegrationContext,
} from "../services/integrations/gmail.js";
import { deleteOAuthToken } from "../services/oauth-tokens.js";
import { parseBody, parseQuery } from "../validators/http.js";
import { gmailMessagesQuerySchema, gmailSendBodySchema } from "../validators/schemas.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function getGmailAccessTokenForUser(req: AuthRequest): Promise<string | null> {
  if (!req.user) return null;
  const ctx: UserIntegrationContext = {
    supabase: createUserSupabaseFromRequest(req),
    userId: req.user.id,
  };
  return getGmailAccessTokenForContext(ctx);
}

export function gmailRouter(): Router {
  const router = Router();

  router.get("/messages", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    if (!isGmailMcpConfigured()) {
      res.status(503).json({ error: MCP_ERROR_MESSAGES.gmail });
      return;
    }
    try {
      const ctx: UserIntegrationContext = {
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      };
      const accessToken = await getGmailAccessTokenForContext(ctx);
      if (!accessToken) {
        res.status(403).json({ error: "Connectez Gmail depuis la page Mails." });
        return;
      }
      const { maxResults, q } = parseQuery(gmailMessagesQuerySchema, req);
      const result = await callGmailMcpTool("list_messages", { max_results: maxResults, query: q }, accessToken);
      const data = parseMcpResultJson<{ messages?: unknown[] }>(result);
      const messages = Array.isArray(data.messages) ? data.messages : (data as { messages?: unknown }).messages ?? [];
      res.json({ messages });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Gmail MCP";
      res.status(502).json({ error: message });
    }
  });

  router.get("/messages/:messageId", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    if (!isGmailMcpConfigured()) {
      res.status(503).json({ error: MCP_ERROR_MESSAGES.gmail });
      return;
    }
    const messageId = req.params.messageId;
    try {
      const ctx: UserIntegrationContext = {
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      };
      const accessToken = await getGmailAccessTokenForContext(ctx);
      if (!accessToken) {
        res.status(403).json({ error: "Connectez Gmail depuis la page Mails." });
        return;
      }
      const result = await callGmailMcpTool("get_message", { message_id: messageId }, accessToken);
      const data = parseMcpResultJson(result);
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Gmail MCP";
      res.status(502).json({ error: message });
    }
  });

  router.post("/send", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    if (!isGmailMcpConfigured()) {
      res.status(503).json({ error: MCP_ERROR_MESSAGES.gmail });
      return;
    }
    try {
      const ctx: UserIntegrationContext = {
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      };
      const accessToken = await getGmailAccessTokenForContext(ctx);
      if (!accessToken) {
        res.status(403).json({ error: "Connectez Gmail depuis la page Mails." });
        return;
      }
      const { to, subject, body } = parseBody(gmailSendBodySchema, req);
      const result = await callGmailMcpTool("send_email", { to, subject: subject ?? "", body: body ?? "" }, accessToken);
      const data = parseMcpResultJson(result);
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Gmail MCP";
      res.status(502).json({ error: message });
    }
  });

  router.post("/disconnect", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const supabase = createUserSupabaseFromRequest(req);
      await deleteOAuthToken(supabase, req.user.id, "gmail");
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Impossible de déconnecter Gmail." });
      return;
    }
  });

  router.get("/status", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const status = await getGmailConnectionStatus({
        supabase: createUserSupabaseFromRequest(req),
        userId: req.user.id,
      });
      res.json(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Gmail";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
