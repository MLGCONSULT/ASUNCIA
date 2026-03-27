import type { SupabaseClient } from "@supabase/supabase-js";
import { getValidNotionAccessToken, type NotionTokenRow } from "../../lib/notion-oauth.js";
import {
  type NotionMcpRuntimeConfig,
  getNotionRuntimeMode,
  hasNotionEnvToken,
  isNotionMcpConfigured,
} from "../../mcp/notion-client.js";
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
  runtimeConfig?: NotionMcpRuntimeConfig;
  canDisconnect: boolean;
  needsReconnect?: boolean;
};

function getNotionRedirectUri(): string {
  return process.env.NOTION_OAUTH_REDIRECT_URI?.trim() || `http://localhost:${process.env.PORT || 4000}/api/auth/notion/callback`;
}

export function hasNotionOAuthConfig(): boolean {
  return !!process.env.NOTION_OAUTH_REDIRECT_URI?.trim();
}

export async function getNotionRuntimeAccess(ctx: UserIntegrationContext): Promise<RuntimeAccess> {
  const userConfig = await getUserMcpConfig(ctx.supabase, ctx.userId);
  const runtimeConfig: NotionMcpRuntimeConfig = {
    url: userConfig.notion?.mcpUrl,
    runtimeMode: userConfig.notion?.runtimeMode,
    serverToken: userConfig.notion?.serverToken,
  };
  const hasUserServerToken = runtimeConfig.runtimeMode !== "oauth" && !!runtimeConfig.serverToken;
  if (hasUserServerToken || hasNotionEnvToken()) {
    return {
      available: true,
      source: "server-token",
      accessToken: runtimeConfig.serverToken || undefined,
      runtimeConfig,
      canDisconnect: false,
    };
  }

  const row = await getOAuthTokenRecord(ctx.supabase, ctx.userId, "notion");
  if (!row?.refresh_token && !row?.access_token) {
    return {
      available: false,
      source: "none",
      canDisconnect: false,
    };
  }

  let accessToken: string | null;
  try {
    accessToken = await getValidNotionAccessToken(
      row as NotionTokenRow,
      getNotionRedirectUri(),
      async (newAccessToken, expiresAt) => {
        await updateOAuthToken(ctx.supabase, ctx.userId, "notion", {
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

export async function getNotionConnectionStatus(ctx: UserIntegrationContext) {
  const runtime = await getNotionRuntimeAccess(ctx);
  return {
    configured: isNotionMcpConfigured(),
    selectedMode: getNotionRuntimeMode(runtime.runtimeConfig),
    oauthConfigured: hasNotionOAuthConfig(),
    connected: runtime.available,
    source: runtime.source,
    canDisconnect: runtime.canDisconnect,
    needsReconnect: runtime.needsReconnect ?? false,
  };
}
