import { createClient } from "@/lib/supabase/server";
import { safeAppPathAfterAuth } from "@/lib/site-url";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = safeAppPathAfterAuth(searchParams.get("redirect"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(redirect, origin).toString());
    }
  }

  return NextResponse.redirect(new URL("/connexion?error=auth", origin).toString());
}
