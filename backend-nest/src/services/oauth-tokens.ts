import type { SupabaseClient } from "@supabase/supabase-js";

export type OAuthProvider = "gmail" | "notion" | "airtable";

export type OAuthTokenRecord = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

type UpdateTokenInput = {
  accessToken: string;
  expiresAt: string | null;
};

type UpsertTokenInput = {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
};

export async function getOAuthTokenRecord(
  supabase: SupabaseClient,
  userId: string,
  provider: OAuthProvider,
): Promise<OAuthTokenRecord | null> {
  const { data } = await supabase
    .from("oauth_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("utilisateur_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  return data
    ? {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      }
    : null;
}

export async function updateOAuthToken(
  supabase: SupabaseClient,
  userId: string,
  provider: OAuthProvider,
  input: UpdateTokenInput,
): Promise<void> {
  await supabase
    .from("oauth_tokens")
    .update({
      access_token: input.accessToken,
      expires_at: input.expiresAt,
      date_mise_a_jour: new Date().toISOString(),
    })
    .eq("utilisateur_id", userId)
    .eq("provider", provider);
}

export async function upsertOAuthToken(
  supabase: SupabaseClient,
  userId: string,
  provider: OAuthProvider,
  input: UpsertTokenInput,
): Promise<void> {
  await supabase.from("oauth_tokens").upsert(
    {
      utilisateur_id: userId,
      provider,
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
      expires_at: input.expiresAt,
      date_mise_a_jour: new Date().toISOString(),
    },
    { onConflict: "utilisateur_id,provider" },
  );
}

export async function deleteOAuthToken(
  supabase: SupabaseClient,
  userId: string,
  provider: OAuthProvider,
): Promise<void> {
  await supabase
    .from("oauth_tokens")
    .delete()
    .eq("utilisateur_id", userId)
    .eq("provider", provider);
}

