import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  buildAirtableAuthorizationUrl,
  exchangeAirtableCodeForTokens,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "../lib/airtable-oauth";
import { getAirtableRuntimeMode } from "../mcp/airtable-client";
import { createUserSupabaseFromRequest } from "../services/auth-context";
import { getAirtableConnectionStatus } from "../services/integrations/airtable";
import {
  consumePendingOAuthState,
  persistPendingOAuthState,
} from "../services/oauth-state";
import { createSupabaseServiceClient } from "../lib/supabase";
import { deleteOAuthToken, upsertOAuthToken } from "../services/oauth-tokens";

type AuthRequest = Request & { user?: { id: string } };

const AIRTABLE_PROVIDER = "airtable";

function getRedirectUri(req: Request): string {
  const base = process.env.AIRTABLE_OAUTH_REDIRECT_URI?.trim();
  if (base) return base;
  const protocol = (req.protocol as string) || "http";
  const host = req.get("host") || `localhost:${process.env.PORT || 4000}`;
  return `${protocol}://${host}/api/auth/airtable/callback`;
}

function getClientId(): string {
  const id = process.env.AIRTABLE_OAUTH_CLIENT_ID?.trim();
  if (!id) throw new Error("AIRTABLE_OAUTH_CLIENT_ID manquant dans .env");
  return id;
}

function getClientSecret(): string | undefined {
  return process.env.AIRTABLE_OAUTH_CLIENT_SECRET?.trim();
}

@Controller("auth/airtable")
export class AirtableAuthController {
  @Get("redirect")
  async redirect(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (getAirtableRuntimeMode() === "server-token") {
      throw new HttpException(
        {
          error:
            "Airtable est configure en mode server-token. Desactivez ce mode pour utiliser OAuth.",
        },
        HttpStatus.CONFLICT,
      );
    }
    try {
      const redirectUri = getRedirectUri(req);
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();
      const clientId = getClientId();
      await persistPendingOAuthState({
        provider: AIRTABLE_PROVIDER,
        state,
        userId: req.user.id,
        codeVerifier,
        redirectUri,
        clientId,
        clientSecret: getClientSecret() ?? null,
      });
      const redirectUrl = buildAirtableAuthorizationUrl(
        clientId,
        redirectUri,
        codeChallenge,
        state,
      );
      return { redirectUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur OAuth Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("callback")
  async callback(@Req() req: Request, @Res() res: Response) {
    const code = (req.query.code as string | undefined)?.trim();
    const state = (req.query.state as string | undefined)?.trim();
    const error = req.query.error as string | undefined;

    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";
    const successRedirect = `${frontendUrl}/app/airtable?connected=true`;
    const errorRedirect = (msg: string) =>
      `${frontendUrl}/app/airtable?error=${encodeURIComponent(msg)}`;

    if (error) {
      res.redirect(302, errorRedirect(`Erreur Airtable: ${error}`));
      return;
    }

    if (!code || !state) {
      res.redirect(
        302,
        errorRedirect("Code ou state manquant dans la réponse Airtable."),
      );
      return;
    }

    const pendingData = await consumePendingOAuthState(AIRTABLE_PROVIDER, state);
    if (!pendingData) {
      res.redirect(
        302,
        errorRedirect("State invalide ou expiré. Réessayez la connexion."),
      );
      return;
    }

    try {
      const redirectUri = pendingData.redirectUri || getRedirectUri(req);
      const clientId = pendingData.clientId || getClientId();
      const clientSecret = pendingData.clientSecret || getClientSecret();
      const tokens = await exchangeAirtableCodeForTokens(
        code,
        pendingData.codeVerifier,
        clientId,
        clientSecret,
        redirectUri,
      );

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      const supabase = createSupabaseServiceClient();
      await upsertOAuthToken(supabase, pendingData.userId, AIRTABLE_PROVIDER, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
      });
      res.redirect(302, successRedirect);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la connexion Airtable";
      res.redirect(302, errorRedirect(message));
    }
  }

  @Get("status")
  async status(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    const status = await getAirtableConnectionStatus({
      supabase: createUserSupabaseFromRequest(req),
      userId: req.user.id,
    });
    return status;
  }

  @Post("disconnect")
  async disconnect(@Req() req: AuthRequest, @Body() _body: unknown) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    try {
      await deleteOAuthToken(
        createUserSupabaseFromRequest(req),
        req.user.id,
        AIRTABLE_PROVIDER,
      );
      return { success: true };
    } catch {
      throw new HttpException(
        { error: "Impossible de déconnecter Airtable" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

