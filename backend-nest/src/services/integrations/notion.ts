import type { SupabaseClient } from "@supabase/supabase-js";
import { getValidNotionAccessToken, type NotionTokenRow } from "../../lib/notion-oauth";
import { getNotionRuntimeMode, hasNotionEnvToken, isNotionMcpConfigured } from "../../mcp/notion-client";
import { getOAuthTokenRecord, updateOAuthToken } from "../oauth-tokens";

export type UserIntegrationContext = {
  supabase: SupabaseClient;
  userId: string;
};

export type RuntimeAccess = {
  available: boolean;
  source: "oauth" | "server-token" | "none";
  accessToken?: string;
  canDisconnect: boolean;
  needsReconnect?: boolean;
};

function getNotionRedirectUri(): string {
  return (
    process.env.NOTION_OAUTH_REDIRECT_URI?.trim() ||
    `http://localhost:${process.env.PORT || 4000}/api/auth/notion/callback`
  );
}

export function hasNotionOAuthConfig(): boolean {
  return !!process.env.NOTION_OAUTH_REDIRECT_URI?.trim();
}

export async function getNotionRuntimeAccess(ctx: UserIntegrationContext): Promise<RuntimeAccess> {
  if (hasNotionEnvToken()) {
    return {
      available: true,
      source: "server-token",
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
      },
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
    canDisconnect: true,
  };
}

export async function getNotionConnectionStatus(ctx: UserIntegrationContext) {
  const runtime = await getNotionRuntimeAccess(ctx);
  return {
    configured: isNotionMcpConfigured(),
    selectedMode: getNotionRuntimeMode(),
    oauthConfigured: hasNotionOAuthConfig(),
    connected: runtime.available,
    source: runtime.source,
    canDisconnect: runtime.canDisconnect,
    needsReconnect: runtime.needsReconnect ?? false,
  };
}

