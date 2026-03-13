import { Router, type Request, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { createSupabaseServiceClient } from "../lib/supabase.js";
import {
  getNotionOAuthMetadataAndClient,
  buildNotionAuthorizationUrl,
  exchangeNotionCodeForTokens,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "../lib/notion-oauth.js";
import { getNotionRuntimeMode } from "../mcp/notion-client.js";
import { createUserSupabaseFromRequest } from "../services/auth-context.js";
import { getNotionConnectionStatus } from "../services/integrations/notion.js";
import {
  consumePendingOAuthState,
  persistPendingOAuthState,
} from "../services/oauth-state.js";
import { deleteOAuthToken, upsertOAuthToken } from "../services/oauth-tokens.js";

const NOTION_PROVIDER = "notion";

function getRedirectUri(req: Request): string {
  const base = process.env.NOTION_OAUTH_REDIRECT_URI?.trim();
  if (base) return base;
  const protocol = req.protocol || "http";
  const host = req.get("host") || `localhost:${process.env.PORT || 4000}`;
  return `${protocol}://${host}/api/auth/notion/callback`;
}

export function authNotionRouter(): Router {
  const router = Router();

  /** Retourne l’URL de redirection vers Notion OAuth (le front fait window.location = redirectUrl). */
  router.get("/redirect", requireAuth, async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    if (getNotionRuntimeMode() === "server-token") {
      res.status(409).json({
        error: "Notion est configure en mode server-token. Desactivez ce mode pour utiliser OAuth.",
      });
      return;
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
        state
      );
      res.json({ redirectUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur OAuth Notion";
      res.status(502).json({ error: message });
    }
  });

  /** Callback après autorisation Notion (pas de requireAuth : on a seulement code + state). */
  router.get("/callback", async (req: Request, res: Response) => {
    const frontUrl = (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
    const successRedirect = `${frontUrl}/app/notion?notion=success`;
    const errorRedirect = (msg: string) => `${frontUrl}/app/notion?notion=error&message=${encodeURIComponent(msg)}`;

    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    const error = typeof req.query.error === "string" ? req.query.error : null;

    if (error) {
      res.redirect(302, errorRedirect(req.query.error_description as string || error));
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
        redirectUri
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
      const message = err instanceof Error ? err.message : "Erreur lors de la connexion Notion";
      res.redirect(302, errorRedirect(message));
    }
  });

  /** Statut de connexion Notion pour l’utilisateur courant. */
  router.get("/status", requireAuth, async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    const status = await getNotionConnectionStatus({
      supabase: createUserSupabaseFromRequest(req),
      userId: req.user.id,
    });
    res.json(status);
  });

  /** Déconnexion Notion (supprime les tokens). */
  router.post("/disconnect", requireAuth, async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      await deleteOAuthToken(createUserSupabaseFromRequest(req), req.user.id, NOTION_PROVIDER);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Impossible de déconnecter Notion." });
      return;
    }
  });

  return router;
}
