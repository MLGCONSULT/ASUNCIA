import { createSupabaseServiceClient } from "../lib/supabase";

export type PendingOAuthProvider = "notion" | "airtable";
export type OAuthRuntimeMode = "auto" | "oauth" | "server-token";

type PersistPendingOAuthInput = {
  provider: PendingOAuthProvider;
  state: string;
  userId: string;
  codeVerifier: string;
  redirectUri?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  ttlMs?: number;
};

export type PendingOAuthState = {
  userId: string;
  codeVerifier: string;
  redirectUri: string | null;
  clientId: string | null;
  clientSecret: string | null;
};

type StoredOAuthClientInput = {
  provider: PendingOAuthProvider;
  redirectUri: string;
  clientId: string;
  clientSecret?: string | null;
};

export type StoredOAuthClient = {
  clientId: string;
  clientSecret: string | null;
};

const DEFAULT_PENDING_TTL_MS = 10 * 60 * 1000;
const pendingFallback = new Map<
  string,
  PendingOAuthState & { provider: PendingOAuthProvider; expiresAt: number }
>();
const clientFallback = new Map<string, StoredOAuthClient>();

function getPendingFallbackKey(provider: PendingOAuthProvider, state: string): string {
  return `${provider}:${state}`;
}

function getClientFallbackKey(provider: PendingOAuthProvider, redirectUri: string): string {
  return `${provider}:${redirectUri}`;
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.includes("schema cache") === true ||
    error.message?.includes("Could not find the table") === true
  );
}

function cleanupPendingFallback(): void {
  const now = Date.now();
  for (const [key, value] of pendingFallback.entries()) {
    if (value.expiresAt <= now) {
      pendingFallback.delete(key);
    }
  }
}

function normalizeRuntimeMode(value: string | undefined): OAuthRuntimeMode {
  if (value === "oauth" || value === "server-token") {
    return value;
  }
  return "auto";
}

export function getProviderRuntimeMode(envValue: string | undefined): OAuthRuntimeMode {
  return normalizeRuntimeMode(envValue?.trim().toLowerCase());
}

async function cleanupExpiredPendingStates(): Promise<void> {
  cleanupPendingFallback();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("oauth_pending")
    .delete()
    .lt("expires_at", new Date().toISOString());

  if (error && !isMissingTableError(error)) {
    throw new Error(`Impossible de nettoyer les etats OAuth expires: ${error.message}`);
  }
}

export async function persistPendingOAuthState(input: PersistPendingOAuthInput): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const expiresAt = new Date(Date.now() + (input.ttlMs ?? DEFAULT_PENDING_TTL_MS)).toISOString();
  const fallbackExpiresAt = new Date(expiresAt).getTime();

  await cleanupExpiredPendingStates();

  const { error } = await supabase.from("oauth_pending").upsert(
    {
      provider: input.provider,
      state: input.state,
      utilisateur_id: input.userId,
      code_verifier: input.codeVerifier,
      redirect_uri: input.redirectUri ?? null,
      client_id: input.clientId ?? null,
      client_secret: input.clientSecret ?? null,
      expires_at: expiresAt,
      date_mise_a_jour: new Date().toISOString(),
    },
    { onConflict: "provider,state" },
  );

  if (error) {
    if (isMissingTableError(error)) {
      pendingFallback.set(getPendingFallbackKey(input.provider, input.state), {
        provider: input.provider,
        userId: input.userId,
        codeVerifier: input.codeVerifier,
        redirectUri: input.redirectUri ?? null,
        clientId: input.clientId ?? null,
        clientSecret: input.clientSecret ?? null,
        expiresAt: fallbackExpiresAt,
      });
      return;
    }
    throw new Error(`Impossible d'enregistrer l'etat OAuth ${input.provider}: ${error.message}`);
  }
}

export async function consumePendingOAuthState(
  provider: PendingOAuthProvider,
  state: string,
): Promise<PendingOAuthState | null> {
  cleanupPendingFallback();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("oauth_pending")
    .select("id, utilisateur_id, code_verifier, redirect_uri, client_id, client_secret, expires_at")
    .eq("provider", provider)
    .eq("state", state)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      const fallback = pendingFallback.get(getPendingFallbackKey(provider, state));
      if (!fallback) {
        return null;
      }
      pendingFallback.delete(getPendingFallbackKey(provider, state));
      if (fallback.expiresAt <= Date.now()) {
        return null;
      }
      return {
        userId: fallback.userId,
        codeVerifier: fallback.codeVerifier,
        redirectUri: fallback.redirectUri,
        clientId: fallback.clientId,
        clientSecret: fallback.clientSecret,
      };
    }
    throw new Error(`Impossible de lire l'etat OAuth ${provider}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  await supabase.from("oauth_pending").delete().eq("id", data.id);

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return null;
  }

  return {
    userId: data.utilisateur_id,
    codeVerifier: data.code_verifier,
    redirectUri: data.redirect_uri,
    clientId: data.client_id,
    clientSecret: data.client_secret,
  };
}

export async function getStoredOAuthClient(
  provider: PendingOAuthProvider,
  redirectUri: string,
): Promise<StoredOAuthClient | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("oauth_provider_clients")
    .select("client_id, client_secret")
    .eq("provider", provider)
    .eq("redirect_uri", redirectUri)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return clientFallback.get(getClientFallbackKey(provider, redirectUri)) ?? null;
    }
    throw new Error(`Impossible de lire le client OAuth ${provider}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    clientId: data.client_id,
    clientSecret: data.client_secret,
  };
}

export async function upsertStoredOAuthClient(input: StoredOAuthClientInput): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("oauth_provider_clients").upsert(
    {
      provider: input.provider,
      redirect_uri: input.redirectUri,
      client_id: input.clientId,
      client_secret: input.clientSecret ?? null,
      date_mise_a_jour: new Date().toISOString(),
    },
    { onConflict: "provider,redirect_uri" },
  );

  if (error) {
    if (isMissingTableError(error)) {
      clientFallback.set(getClientFallbackKey(input.provider, input.redirectUri), {
        clientId: input.clientId,
        clientSecret: input.clientSecret ?? null,
      });
      return;
    }
    throw new Error(`Impossible d'enregistrer le client OAuth ${input.provider}: ${error.message}`);
  }
}

