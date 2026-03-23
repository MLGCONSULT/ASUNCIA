import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Param,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import { callGmailMcpTool, isGmailMcpConfigured } from "../mcp/gmail-client";
import { parseMcpResultJson } from "../mcp/result";
import { createUserSupabaseFromRequest } from "../services/auth-context";
import {
  getGmailAccessTokenForContext,
  getGmailConnectionStatus,
  type UserIntegrationContext,
} from "../services/integrations/gmail";

type AuthRequest = Request & { user?: { id: string } };

type GmailMessagesQuery = {
  maxResults?: number;
  q?: string;
};

type GmailSendBody = {
  to: string;
  subject?: string | null;
  body?: string | null;
};

@Controller("gmail")
export class GmailController {
  private readonly gmailUnavailableMessage =
    "Gmail est desactive dans cette version (MCP retire).";

  private getUserContext(req: AuthRequest): UserIntegrationContext {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    return {
      supabase: createUserSupabaseFromRequest(req),
      userId: req.user.id,
    };
  }

  @Get("messages")
  async listMessages(@Req() req: AuthRequest, @Req() rawReq: AuthRequest & { query?: GmailMessagesQuery }) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isGmailMcpConfigured()) {
      throw new HttpException({ error: this.gmailUnavailableMessage }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const ctx = this.getUserContext(req);
      const accessToken = await getGmailAccessTokenForContext(ctx);
      if (!accessToken) {
        throw new HttpException(
          { error: "Connectez Gmail depuis la page Mails." },
          HttpStatus.FORBIDDEN,
        );
      }
      const { maxResults, q } = (rawReq.query || {}) as GmailMessagesQuery;
      const result = await callGmailMcpTool(
        "list_messages",
        { max_results: maxResults, query: q },
        accessToken,
      );
      const data = parseMcpResultJson<{ messages?: unknown[] }>(result);
      const messages = Array.isArray(data.messages)
        ? data.messages
        : (data as { messages?: unknown }).messages ?? [];
      return { messages };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Gmail MCP";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("messages/:messageId")
  async getMessage(@Req() req: AuthRequest, @Param("messageId") messageId: string) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isGmailMcpConfigured()) {
      throw new HttpException({ error: this.gmailUnavailableMessage }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const ctx = this.getUserContext(req);
      const accessToken = await getGmailAccessTokenForContext(ctx);
      if (!accessToken) {
        throw new HttpException(
          { error: "Connectez Gmail depuis la page Mails." },
          HttpStatus.FORBIDDEN,
        );
      }
      const result = await callGmailMcpTool("get_message", { message_id: messageId }, accessToken);
      const data = parseMcpResultJson(result);
      return data;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Gmail MCP";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("send")
  async send(@Req() req: AuthRequest, @Body() body: GmailSendBody) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isGmailMcpConfigured()) {
      throw new HttpException({ error: this.gmailUnavailableMessage }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const ctx = this.getUserContext(req);
      const accessToken = await getGmailAccessTokenForContext(ctx);
      if (!accessToken) {
        throw new HttpException(
          { error: "Connectez Gmail depuis la page Mails." },
          HttpStatus.FORBIDDEN,
        );
      }
      const { to, subject, body: content } = body;
      const result = await callGmailMcpTool(
        "send_email",
        { to, subject: subject ?? "", body: content ?? "" },
        accessToken,
      );
      const data = parseMcpResultJson(result);
      return data;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Gmail MCP";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("disconnect")
  async disconnect(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    try {
      const supabase = createUserSupabaseFromRequest(req);
      const { deleteOAuthToken } = await import("../services/oauth-tokens.js");
      await deleteOAuthToken(supabase, req.user.id, "gmail");
      return { ok: true };
    } catch {
      throw new HttpException(
        { error: "Impossible de déconnecter Gmail." },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("status")
  async status(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    try {
      const status = await getGmailConnectionStatus(this.getUserContext(req));
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Gmail";
      throw new HttpException({ error: message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

