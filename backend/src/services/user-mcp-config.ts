import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "../lib/supabase.js";
import { decryptSecret, encryptSecret } from "../lib/secrets.js";

export type UserSupabaseMcpConfig = {
  mcpUrl?: string | null;
  accessToken?: string | null;
  projectRef?: string | null;
};

export type UserN8nMcpConfig = {
  mcpUrl?: string | null;
  accessToken?: string | null;
};

export type UserAirtableMcpConfig = {
  runtimeMode?: "oauth" | "server-token" | "auto";
  mcpUrl?: string | null;
  serverToken?: string | null;
};

export type UserNotionMcpConfig = {
  runtimeMode?: "oauth" | "server-token" | "auto";
  mcpUrl?: string | null;
  oauthClientId?: string | null;
  oauthClientSecret?: string | null;
  oauthRedirectUri?: string | null;
  serverToken?: string | null;
};

export type UserMcpConfig = {
  supabase?: UserSupabaseMcpConfig;
  n8n?: UserN8nMcpConfig;
  airtable?: UserAirtableMcpConfig;
  notion?: UserNotionMcpConfig;
};

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeRuntimeMode(value: unknown): "oauth" | "server-token" | "auto" | undefined {
  if (value === "oauth" || value === "server-token" || value === "auto") return value;
  return undefined;
}

function sanitizeConfig(input: unknown): UserMcpConfig {
  const root = asObj(input);
  const supabase = asObj(root.supabase);
  const n8n = asObj(root.n8n);
  const airtable = asObj(root.airtable);
  const notion = asObj(root.notion);

  return {
    supabase: {
      mcpUrl: asOptionalString(supabase.mcpUrl),
      accessToken: decryptSecret(asOptionalString(supabase.accessToken)),
      projectRef: asOptionalString(supabase.projectRef),
    },
    n8n: {
      mcpUrl: asOptionalString(n8n.mcpUrl),
      accessToken: decryptSecret(asOptionalString(n8n.accessToken)),
    },
    airtable: {
      runtimeMode: sanitizeRuntimeMode(airtable.runtimeMode),
      mcpUrl: asOptionalString(airtable.mcpUrl),
      serverToken: decryptSecret(asOptionalString(airtable.serverToken)),
    },
    notion: {
      runtimeMode: sanitizeRuntimeMode(notion.runtimeMode),
      mcpUrl: asOptionalString(notion.mcpUrl),
      oauthClientId: asOptionalString(notion.oauthClientId),
      oauthClientSecret: decryptSecret(asOptionalString(notion.oauthClientSecret)),
      oauthRedirectUri: asOptionalString(notion.oauthRedirectUri),
      serverToken: decryptSecret(asOptionalString(notion.serverToken)),
    },
  };
}

export async function getUserMcpConfig(
  supabase: SupabaseClient,
  userId: string
): Promise<UserMcpConfig> {
  const { data, error } = await supabase
    .from("user_mcp_configs")
    .select("supabase, n8n, airtable, notion")
    .eq("utilisateur_id", userId)
    .maybeSingle();

  if (error) {
    // Table absente (migration non appliquée) : fallback gracieux.
    if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
      return {};
    }
    throw new Error(`Impossible de lire la configuration MCP utilisateur: ${error.message}`);
  }
  if (!data) return {};
  return sanitizeConfig(data);
}

export async function getUserMcpConfigByUserIdWithServiceRole(
  userId: string
): Promise<UserMcpConfig> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("user_mcp_configs")
    .select("supabase, n8n, airtable, notion")
    .eq("utilisateur_id", userId)
    .maybeSingle();
  if (error) {
    if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
      return {};
    }
    throw new Error(`Impossible de lire la configuration MCP utilisateur (service): ${error.message}`);
  }
  if (!data) return {};
  return sanitizeConfig(data);
}

export async function upsertUserMcpConfig(
  supabase: SupabaseClient,
  userId: string,
  input: UserMcpConfig
): Promise<void> {
  const cfg = sanitizeConfig(input);
  const dbCfg = {
    supabase: {
      mcpUrl: cfg.supabase?.mcpUrl ?? null,
      projectRef: cfg.supabase?.projectRef ?? null,
      accessToken: encryptSecret(cfg.supabase?.accessToken),
    },
    n8n: {
      mcpUrl: cfg.n8n?.mcpUrl ?? null,
      accessToken: encryptSecret(cfg.n8n?.accessToken),
    },
    airtable: {
      runtimeMode: cfg.airtable?.runtimeMode ?? null,
      mcpUrl: cfg.airtable?.mcpUrl ?? null,
      serverToken: encryptSecret(cfg.airtable?.serverToken),
    },
    notion: {
      runtimeMode: cfg.notion?.runtimeMode ?? null,
      mcpUrl: cfg.notion?.mcpUrl ?? null,
      oauthClientId: cfg.notion?.oauthClientId ?? null,
      oauthClientSecret: encryptSecret(cfg.notion?.oauthClientSecret),
      oauthRedirectUri: cfg.notion?.oauthRedirectUri ?? null,
      serverToken: encryptSecret(cfg.notion?.serverToken),
    },
  };
  const { error } = await supabase.from("user_mcp_configs").upsert(
    {
      utilisateur_id: userId,
      supabase: dbCfg.supabase,
      n8n: dbCfg.n8n,
      airtable: dbCfg.airtable,
      notion: dbCfg.notion,
      date_mise_a_jour: new Date().toISOString(),
    },
    { onConflict: "utilisateur_id" }
  );
  if (error) {
    throw new Error(`Impossible d'enregistrer la configuration MCP utilisateur: ${error.message}`);
  }
}
