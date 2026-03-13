import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TestContext = { supabase: SupabaseClient; userId: string };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && (serviceKey || anonKey));
}

export function getTestContext(): { ctx: TestContext; supabase: SupabaseClient } {
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL manquant. Configurer .env pour les tests d'intégration.");
  const key = serviceKey ?? anonKey;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY requis.");
  const supabase = createClient(url, key);
  const userId = process.env.TEST_USER_ID ?? "00000000-0000-0000-0000-000000000001";
  return { ctx: { supabase, userId }, supabase };
}
