import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  getNotionOAuthMetadataAndClient,
  buildNotionAuthorizationUrl,
  exchangeNotionCodeForTokens,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "../lib/notion-oauth";
import { getNotionRuntimeMode } from "../mcp/notion-client";
import { createUserSupabaseFromRequest } from "../services/auth-context";
import { getNotionConnectionStatus } from "../services/integrations/notion";
import {
  consumePendingOAuthState,
  persistPendingOAuthState,
} from "../services/oauth-state";
import { deleteOAuthToken, upsertOAuthToken } from "../services/oauth-tokens";
import { createSupabaseServiceClient } from "../lib/supabase";

type AuthRequest = Request & { user?: { id: string } };

const NOTION_PROVIDER = "notion";

function getRedirectUri(req: Request): string {
  const envRedirect = process.env.NOTION_OAUTH_REDIRECT_URI?.trim();
  if (envRedirect) return envRedirect;
  const protocol = (req.protocol as string) || "http";
  const host = req.get("host") || `localhost:${process.env.PORT || 4000}`;
  return `${protocol}://${host}/api/auth/notion/callback`;
}

@Controller("auth/notion")
export class NotionAuthController {
  @Get("redirect")
  async redirect(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (getNotionRuntimeMode() === "server-token") {
      throw new HttpException(
        {
          error: "Notion est configure en mode server-token. Desactivez ce mode pour utiliser OAuth.",
        },
        HttpStatus.CONFLICT,
      );
    }
    try {
      const redirectUri = getRedirectUri(req);
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();
      const { metadata, credentials } = await getNotionOAuthMetadataAndClient(redirectUri);
      await persistPendingOAuthState({
        provider: NOTION_PROVIDER,
        state,
        userId: req.user.id,
        codeVerifier,
        redirectUri,
        clientId: credentials.client_id,
        clientSecret: credentials.client_secret ?? null,
      });
      const redirectUrl = buildNotionAuthorizationUrl(
        metadata,
        credentials.client_id,
        redirectUri,
        codeChallenge,
        state,
      );
      return { redirectUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur OAuth Notion";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("callback")
  async callback(@Req() req: Request, @Res() res: Response) {
    const frontUrl = (
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const successRedirect = `${frontUrl}/app/notion?notion=success`;
    const errorRedirect = (msg: string) =>
      `${frontUrl}/app/notion?notion=error&message=${encodeURIComponent(msg)}`;

    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    const error = typeof req.query.error === "string" ? req.query.error : null;

    if (error) {
      const errDesc =
        typeof req.query.error_description === "string"
          ? req.query.error_description
          : error;
      res.redirect(302, errorRedirect(errDesc));
      return;
    }
    if (!code || !state) {
      res.redirect(302, errorRedirect("Paramètres code ou state manquants"));
      return;
    }

    const pendingData = await consumePendingOAuthState(NOTION_PROVIDER, state);
    if (!pendingData) {
      res.redirect(302, errorRedirect("Lien expiré ou invalide. Recommencez la connexion Notion."));
      return;
    }

    try {
      const redirectUri = pendingData.redirectUri || getRedirectUri(req);
      const { metadata, credentials } = await getNotionOAuthMetadataAndClient(redirectUri);
      const tokens = await exchangeNotionCodeForTokens(
        code,
        pendingData.codeVerifier,
        metadata,
        pendingData.clientId || credentials.client_id,
        redirectUri,
      );

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      const supabase = createSupabaseServiceClient();
      await upsertOAuthToken(supabase, pendingData.userId, NOTION_PROVIDER, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
      });
      res.redirect(302, successRedirect);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la connexion Notion";
      res.redirect(302, errorRedirect(message));
    }
  }

  @Get("status")
  async status(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    return getNotionConnectionStatus({
      supabase: createUserSupabaseFromRequest(req),
      userId: req.user.id,
    });
  }

  @Post("disconnect")
  async disconnect(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    try {
      await deleteOAuthToken(
        createUserSupabaseFromRequest(req),
        req.user.id,
        NOTION_PROVIDER,
      );
      return { ok: true };
    } catch {
      throw new HttpException(
        { error: "Impossible de déconnecter Notion." },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

