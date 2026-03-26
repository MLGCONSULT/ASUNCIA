/**
 * Origine du site pour les redirections Supabase (email de confirmation, renvoi, etc.).
 * Côté client : `window.location.origin` évite les URLs invalides si NEXT_PUBLIC_SITE_URL est absent ou « null ».
 */
export function getSiteOriginForAuthClient(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
}

export function getAuthCallbackUrlClient(): string {
  const origin = getSiteOriginForAuthClient();
  return `${origin}/auth/callback`;
}

/** Chemin interne après login (évite ?redirect=null ou chemins absolus). */
export function safeAppPathAfterAuth(raw: string | null): string {
  const fallback = "/app/dashboard";
  if (raw == null || raw === "" || raw === "null" || raw === "undefined") return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}
