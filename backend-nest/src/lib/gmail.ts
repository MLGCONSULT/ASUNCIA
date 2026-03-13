export type OAuthTokenRow = {
  access_token: string | null;
  refresh_token: string;
  expires_at: string | null;
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function getGoogleClientConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function refreshGmailAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_at: string | null } | null> {
  const config = getGoogleClientConfig();
  if (!config) return null;

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  return { access_token: data.access_token, expires_at: expiresAt };
}

export async function getValidGmailAccessToken(
  row: OAuthTokenRow,
  updateDb: (accessToken: string, expiresAt: string | null) => Promise<void>,
): Promise<string | null> {
  const now = new Date();
  if (row.access_token && row.expires_at && new Date(row.expires_at) > now) {
    return row.access_token;
  }
  const refreshed = await refreshGmailAccessToken(row.refresh_token);
  if (!refreshed) return null;
  await updateDb(refreshed.access_token, refreshed.expires_at);
  return refreshed.access_token;
}

