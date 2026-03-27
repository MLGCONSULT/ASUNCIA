import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const redirectUri =
    process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const baseRedirect = `${redirectUri}/app/mails`;

  const clearStateCookie = (response: NextResponse): NextResponse => {
    response.cookies.set("gmail_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  };

  if (error) {
    return clearStateCookie(
      NextResponse.redirect(
        `${baseRedirect}?error=${encodeURIComponent(error)}`
      )
    );
  }

  if (!code) {
    return clearStateCookie(
      NextResponse.redirect(`${baseRedirect}?error=missing_code`)
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return clearStateCookie(
      NextResponse.redirect(`${baseRedirect}?error=session_expired`)
    );
  }

  const expectedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("gmail_oauth_state="))
    ?.split("=")[1];
  const decodedExpectedState = expectedState
    ? decodeURIComponent(expectedState)
    : null;
  if (!state || !decodedExpectedState || state !== decodedExpectedState) {
    return clearStateCookie(
      NextResponse.redirect(`${baseRedirect}?error=invalid_state`)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const callbackUrl = `${redirectUri}/api/auth/gmail/callback`;

  if (!clientId || !clientSecret) {
    return clearStateCookie(
      NextResponse.redirect(`${baseRedirect}?error=server_config`)
    );
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: callbackUrl,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    if (process.env.NODE_ENV !== "production") {
      console.error("[gmail/callback] token exchange failed:", err);
    }
    return clearStateCookie(
      NextResponse.redirect(
        `${baseRedirect}?error=${encodeURIComponent("token_exchange_failed")}`
      )
    );
  }

  const data = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!data.refresh_token) {
    return clearStateCookie(
      NextResponse.redirect(
        `${baseRedirect}?error=${encodeURIComponent("no_refresh_token")}`
      )
    );
  }

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  const { error: upsertErr } = await supabase.from("oauth_tokens").upsert(
    {
      utilisateur_id: user.id,
      provider: "gmail",
      access_token: data.access_token ?? null,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
      date_mise_a_jour: new Date().toISOString(),
    },
    { onConflict: "utilisateur_id,provider" }
  );

  if (upsertErr) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[gmail/callback] upsert oauth_tokens:", upsertErr);
    }
    return clearStateCookie(
      NextResponse.redirect(
        `${baseRedirect}?error=${encodeURIComponent("save_failed")}`
      )
    );
  }

  return clearStateCookie(
    NextResponse.redirect(`${baseRedirect}?connected=1`)
  );
}
