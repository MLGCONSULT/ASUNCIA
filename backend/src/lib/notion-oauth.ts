/**
 * OAuth 2.0 + PKCE pour le MCP Notion officiel (mcp.notion.com).
 * Voir https://developers.notion.com/guides/mcp/build-mcp-client
 */
import { randomBytes, createHash } from "crypto";
import {
  getStoredOAuthClient,
  upsertStoredOAuthClient,
} from "../services/oauth-state.js";

const NOTION_MCP_BASE = "https://mcp.notion.com";
const PROTECTED_RESOURCE_PATH = "/.well-known/oauth-protected-resource";
const AUTH_SERVER_METADATA_PATH = "/.well-known/oauth-authorization-server";

export type OAuthMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  code_challenge_methods_supported?: string[];
  grant_types_supported?: string[];
};

export type ClientCredentials = {
  client_id: string;
  client_secret?: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

function base64URLEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function generateCodeVerifier(): string {
  return base64URLEncode(randomBytes(32));
}

export function generateCodeChallenge(verifier: string): string {
  return base64URLEncode(createHash("sha256").update(verifier).digest());
}

export function generateState(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Découverte OAuth : Protected Resource (RFC 9470) puis Authorization Server (RFC 8414).
 */
export async function discoverNotionOAuth(): Promise<OAuthMetadata> {
  const protectedUrl = `${NOTION_MCP_BASE}${PROTECTED_RESOURCE_PATH}`;
  const prRes = await fetch(protectedUrl);
  if (!prRes.ok) throw new Error(`Protected resource metadata: ${prRes.status}`);
  const pr = (await prRes.json()) as { authorization_servers?: string[] };
  const authServers = pr.authorization_servers;
  if (!Array.isArray(authServers) || authServers.length === 0) {
    throw new Error("No authorization_servers in Notion metadata");
  }
  const authBase = authServers[0].replace(/\/$/, "");
  const metaUrl = `${authBase}${AUTH_SERVER_METADATA_PATH}`;
  const metaRes = await fetch(metaUrl);
  if (!metaRes.ok) throw new Error(`Authorization server metadata: ${metaRes.status}`);
  const metadata = (await metaRes.json()) as OAuthMetadata;
  if (!metadata.authorization_endpoint || !metadata.token_endpoint) {
    throw new Error("Missing OAuth endpoints in Notion metadata");
  }
  return metadata;
}

/**
 * Enregistrement dynamique du client (RFC 7591).
 */
export async function registerNotionClient(
  metadata: OAuthMetadata,
  redirectUri: string
): Promise<ClientCredentials> {
  if (!metadata.registration_endpoint) {
    throw new Error("Notion MCP does not support dynamic client registration");
  }
  const body = {
    client_name: "Asuncia Formation",
    redirect_uris: [redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    scope: "",
  };
  const res = await fetch(metadata.registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion client registration failed: ${res.status} ${text}`);
  }
  const creds = (await res.json()) as ClientCredentials;
  if (!creds.client_id) throw new Error("Missing client_id in Notion registration");
  return creds;
}

/**
 * Construit l’URL d’autorisation pour rediriger l’utilisateur.
 */
export function buildNotionAuthorizationUrl(
  metadata: OAuthMetadata,
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state: string
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent",
  });
  return `${metadata.authorization_endpoint}?${params.toString()}`;
}

/**
 * Échange le code d’autorisation contre les tokens.
 */
export async function exchangeNotionCodeForTokens(
  code: string,
  codeVerifier: string,
  metadata: OAuthMetadata,
  clientId: string,
  redirectUri: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
  const res = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion token exchange failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) throw new Error("Missing access_token in Notion response");
  return data;
}

/**
 * Rafraîchit l’access token avec le refresh token.
 */
export async function refreshNotionAccessToken(
  refreshToken: string,
  metadata: OAuthMetadata,
  clientId: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const res = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 400) {
      try {
        const err = JSON.parse(text) as { error?: string };
        if (err.error === "invalid_grant") throw new Error("REAUTH_REQUIRED");
      } catch (e) {
        if (e instanceof Error && e.message === "REAUTH_REQUIRED") throw e;
      }
    }
    throw new Error(`Notion token refresh failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) throw new Error("Missing access_token in Notion refresh response");
  return data;
}

function getConfiguredNotionClient(): ClientCredentials | null {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID?.trim();
  if (!clientId) {
    return null;
  }
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET?.trim();
  return {
    client_id: clientId,
    client_secret: clientSecret || undefined,
  };
}

// Cache metadata + client_id par redirect_uri (pour redirect et refresh)
const metadataCache = new Map<
  string,
  { metadata: OAuthMetadata; credentials: ClientCredentials }
>();

export async function getNotionOAuthMetadataAndClient(
  redirectUri: string,
  preferredClient?: { clientId?: string | null; clientSecret?: string | null }
): Promise<{
  metadata: OAuthMetadata;
  credentials: ClientCredentials;
}> {
  const preferredClientId = preferredClient?.clientId?.trim();
  if (preferredClientId) {
    const metadata = await discoverNotionOAuth();
    return {
      metadata,
      credentials: {
        client_id: preferredClientId,
        client_secret: preferredClient?.clientSecret?.trim() || undefined,
      },
    };
  }
  const configuredClient = getConfiguredNotionClient();
  if (configuredClient) {
    const metadata = await discoverNotionOAuth();
    return {
      metadata,
      credentials: configuredClient,
    };
  }

  const cached = metadataCache.get(redirectUri);
  if (cached) return cached;

  const metadata = await discoverNotionOAuth();
  const storedClient = await getStoredOAuthClient("notion", redirectUri);
  if (storedClient) {
    const stable = {
      metadata,
      credentials: {
        client_id: storedClient.clientId,
        client_secret: storedClient.clientSecret || undefined,
      },
    };
    metadataCache.set(redirectUri, stable);
    return stable;
  }

  const credentials = await registerNotionClient(metadata, redirectUri);
  await upsertStoredOAuthClient({
    provider: "notion",
    redirectUri,
    clientId: credentials.client_id,
    clientSecret: credentials.client_secret ?? null,
  });
  metadataCache.set(redirectUri, { metadata, credentials });
  return { metadata, credentials };
}

export type NotionTokenRow = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

/** Retourne un access token valide (utilise le cache si pas expiré, sinon refresh). */
export async function getValidNotionAccessToken(
  row: NotionTokenRow,
  redirectUri: string,
  updateDb: (accessToken: string, expiresAt: string | null) => Promise<void>
): Promise<string | null> {
  const now = Date.now();
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (row.access_token && expiresAt > now + 60_000) {
    return row.access_token;
  }
  if (!row.refresh_token) return null;
  const { metadata, credentials } = await getNotionOAuthMetadataAndClient(redirectUri);
  const tokens = await refreshNotionAccessToken(row.refresh_token, metadata, credentials.client_id);
  const newExpires = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;
  await updateDb(tokens.access_token, newExpires);
  return tokens.access_token;
}
