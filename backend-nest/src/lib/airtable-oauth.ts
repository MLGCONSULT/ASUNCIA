import { randomBytes, createHash } from "crypto";

const AIRTABLE_OAUTH_BASE = "https://airtable.com";
const AUTHORIZATION_ENDPOINT = "/oauth2/v1/authorize";
const TOKEN_ENDPOINT = "/oauth2/v1/token";

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

export function buildAirtableAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    scope: "data.records:read data.records:write schema.bases:read schema.bases:write",
  });
  return `${AIRTABLE_OAUTH_BASE}${AUTHORIZATION_ENDPOINT}?${params.toString()}`;
}

export async function exchangeAirtableCodeForTokens(
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string | undefined,
  redirectUri: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (clientSecret) {
    body.append("client_secret", clientSecret);
  }

  const res = await fetch(`${AIRTABLE_OAUTH_BASE}${TOKEN_ENDPOINT}`, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable token exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) throw new Error("Missing access_token in Airtable response");
  return data;
}

export async function refreshAirtableAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string | undefined,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  if (clientSecret) {
    body.append("client_secret", clientSecret);
  }

  const res = await fetch(`${AIRTABLE_OAUTH_BASE}${TOKEN_ENDPOINT}`, {
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
    throw new Error(`Airtable token refresh failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) throw new Error("Missing access_token in Airtable refresh response");
  return data;
}

export type AirtableTokenRow = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

export async function getValidAirtableAccessToken(
  row: AirtableTokenRow,
  clientId: string,
  clientSecret: string | undefined,
  updateDb: (accessToken: string, expiresAt: string | null) => Promise<void>,
): Promise<string | null> {
  const now = Date.now();
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;

  if (row.access_token && expiresAt > now + 60_000) {
    return row.access_token;
  }

  if (!row.refresh_token) return null;

  const tokens = await refreshAirtableAccessToken(row.refresh_token, clientId, clientSecret);
  const newExpires = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;
  await updateDb(tokens.access_token, newExpires);
  return tokens.access_token;
}

