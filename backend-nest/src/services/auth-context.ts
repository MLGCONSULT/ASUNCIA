import type { Request } from "express";
import { createSupabaseClient } from "../lib/supabase";

export function getBearerToken(req: Request): string {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
}

export function createUserSupabaseFromRequest(req: Request) {
  return createSupabaseClient(getBearerToken(req));
}

