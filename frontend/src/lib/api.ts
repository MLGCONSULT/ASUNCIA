"use client";

import { createClient } from "@/lib/supabase/client";

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ?? "";

export async function fetchBackend(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const base = getBaseUrl();
  const url = path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, {
    ...options,
    headers,
  });
}

export function getBackendUrl(): string {
  return getBaseUrl();
}
