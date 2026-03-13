import type { SupabaseClient } from "@supabase/supabase-js";
import { getValidGmailAccessToken, type OAuthTokenRow } from "../../lib/gmail.js";
import { isGmailMcpConfigured } from "../../mcp/gmail-client.js";
import { getOAuthTokenRecord, updateOAuthToken } from "../oauth-tokens.js";

export type UserIntegrationContext = {
  supabase: SupabaseClient;
  userId: string;
};

export function hasGoogleOAuthConfig(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID?.trim() && !!process.env.GOOGLE_CLIENT_SECRET?.trim();
}

export async function getGmailAccessTokenForContext(ctx: UserIntegrationContext): Promise<string | null> {
  const row = await getOAuthTokenRecord(ctx.supabase, ctx.userId, "gmail");
  if (!row?.refresh_token) return null;

  const tokenRow: OAuthTokenRow = {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: row.expires_at,
  };

  return getValidGmailAccessToken(tokenRow, async (accessToken, expiresAt) => {
    await updateOAuthToken(ctx.supabase, ctx.userId, "gmail", { accessToken, expiresAt });
  });
}

export async function getGmailConnectionStatus(ctx: UserIntegrationContext) {
  const row = await getOAuthTokenRecord(ctx.supabase, ctx.userId, "gmail");
  return {
    configured: isGmailMcpConfigured(),
    oauthConfigured: hasGoogleOAuthConfig(),
    selectedMode: "read-send",
    connected: !!row?.refresh_token,
    source: row?.refresh_token ? ("oauth" as const) : ("none" as const),
    canDisconnect: !!row?.refresh_token,
    capabilities: ["read_messages", "send_email"],
  };
}
