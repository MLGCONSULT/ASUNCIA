import { Router, type Request, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { createSupabaseServiceClient } from "../lib/supabase.js";
import {
  buildAirtableAuthorizationUrl,
  exchangeAirtableCodeForTokens,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "../lib/airtable-oauth.js";
import { getAirtableRuntimeMode } from "../mcp/airtable-client.js";
import { createUserSupabaseFromRequest } from "../services/auth-context.js";
import { getAirtableConnectionStatus } from "../services/integrations/airtable.js";
import {
  consumePendingOAuthState,
  persistPendingOAuthState,
} from "../services/oauth-state.js";
import { deleteOAuthToken, upsertOAuthToken } from "../services/oauth-tokens.js";

const AIRTABLE_PROVIDER = "airtable";

function getRedirectUri(req: Request): string {
  const base = process.env.AIRTABLE_OAUTH_REDIRECT_URI?.trim();
  if (base) return base;
  const protocol = req.protocol || "http";
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

export function authAirtableRouter(): Router {
  const router = Router();

  /** Retourne l'URL de redirection vers Airtable OAuth (le front fait window.location = redirectUrl). */
  router.get("/redirect", requireAuth, async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    if (getAirtableRuntimeMode() === "server-token") {
      res.status(409).json({
        error: "Airtable est configure en mode server-token. Desactivez ce mode pour utiliser OAuth.",
      });
      return;
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
      const redirectUrl = buildAirtableAuthorizationUrl(clientId, redirectUri, codeChallenge, state);
      res.json({ redirectUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur OAuth Airtable";
      res.status(502).json({ error: message });
    }
  });

  /** Callback après autorisation Airtable (pas de requireAuth : on a seulement code + state). */
  router.get("/callback", async (req: Request, res: Response) => {
    const code = (req.query.code as string)?.trim();
    const state = (req.query.state as string)?.trim();
    const error = req.query.error as string | undefined;

    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const successRedirect = `${frontendUrl}/app/airtable?connected=true`;
    const errorRedirect = (msg: string) => `${frontendUrl}/app/airtable?error=${encodeURIComponent(msg)}`;

    if (error) {
      res.redirect(302, errorRedirect(`Erreur Airtable: ${error}`));
      return;
    }

    if (!code || !state) {
      res.redirect(302, errorRedirect("Code ou state manquant dans la réponse Airtable."));
      return;
    }

    const pendingData = await consumePendingOAuthState(AIRTABLE_PROVIDER, state);
    if (!pendingData) {
      res.redirect(302, errorRedirect("State invalide ou expiré. Réessayez la connexion."));
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
        redirectUri
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
      const message = err instanceof Error ? err.message : "Erreur lors de la connexion Airtable";
      res.redirect(302, errorRedirect(message));
    }
  });

  /** Statut de connexion Airtable pour l'utilisateur courant. */
  router.get("/status", requireAuth, async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    const status = await getAirtableConnectionStatus({
      supabase: createUserSupabaseFromRequest(req),
      userId: req.user.id,
    });
    res.json(status);
  });

  /** Déconnexion Airtable (supprime les tokens). */
  router.post("/disconnect", requireAuth, async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      await deleteOAuthToken(createUserSupabaseFromRequest(req), req.user.id, AIRTABLE_PROVIDER);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Impossible de déconnecter Airtable" });
      return;
    }
  });

  return router;
}
