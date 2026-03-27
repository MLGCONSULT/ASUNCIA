import type { SupabaseClient } from "@supabase/supabase-js";
import { getValidAirtableAccessToken, type AirtableTokenRow } from "../../lib/airtable-oauth.js";
import {
  type AirtableMcpRuntimeConfig,
  getAirtableRuntimeMode,
  isAirtableMcpConfigured,
  isAirtableOAuthConfigured,
} from "../../mcp/airtable-client.js";
import { getOAuthTokenRecord, updateOAuthToken } from "../oauth-tokens.js";
import { getUserMcpConfig } from "../user-mcp-config.js";

export type UserIntegrationContext = {
  supabase: SupabaseClient;
  userId: string;
};

export type RuntimeAccess = {
  available: boolean;
  source: "oauth" | "server-token" | "none";
  accessToken?: string;
  runtimeConfig?: AirtableMcpRuntimeConfig;
  canDisconnect: boolean;
  needsReconnect?: boolean;
};

export async function getAirtableRuntimeAccess(ctx: UserIntegrationContext): Promise<RuntimeAccess> {
  const userConfig = await getUserMcpConfig(ctx.supabase, ctx.userId);
  const runtimeConfig: AirtableMcpRuntimeConfig = {
    url: userConfig.airtable?.mcpUrl,
    serverToken: userConfig.airtable?.serverToken,
    runtimeMode: userConfig.airtable?.runtimeMode,
  };
  const hasUserServerToken = runtimeConfig.runtimeMode !== "oauth" && !!runtimeConfig.serverToken;
  if (hasUserServerToken) {
    return {
      available: true,
      source: "server-token",
      accessToken: runtimeConfig.serverToken || undefined,
      runtimeConfig,
      canDisconnect: false,
    };
  }

  const row = await getOAuthTokenRecord(ctx.supabase, ctx.userId, "airtable");
  if (!row?.refresh_token && !row?.access_token) {
    return {
      available: false,
      source: "none",
      canDisconnect: false,
    };
  }

  const clientId = process.env.AIRTABLE_OAUTH_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.AIRTABLE_OAUTH_CLIENT_SECRET?.trim();
  let accessToken: string | null;
  try {
    accessToken = await getValidAirtableAccessToken(
      row as AirtableTokenRow,
      clientId,
      clientSecret,
      async (newAccessToken, expiresAt) => {
        await updateOAuthToken(ctx.supabase, ctx.userId, "airtable", {
          accessToken: newAccessToken,
          expiresAt,
        });
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "REAUTH_REQUIRED") {
      return {
        available: false,
        source: "none",
        canDisconnect: true,
        needsReconnect: true,
      };
    }
    throw error;
  }

  if (!accessToken) {
    return {
      available: false,
      source: "none",
      canDisconnect: true,
    };
  }

  return {
    available: true,
    source: "oauth",
    accessToken,
    runtimeConfig,
    canDisconnect: true,
  };
}

export async function getAirtableConnectionStatus(ctx: UserIntegrationContext) {
  const runtime = await getAirtableRuntimeAccess(ctx);
  return {
    configured: isAirtableMcpConfigured(runtime.runtimeConfig),
    selectedMode: getAirtableRuntimeMode(runtime.runtimeConfig),
    oauthConfigured: isAirtableOAuthConfigured(runtime.runtimeConfig),
    connected: runtime.available,
    source: runtime.source,
    canDisconnect: runtime.canDisconnect,
    needsReconnect: runtime.needsReconnect ?? false,
  };
}
