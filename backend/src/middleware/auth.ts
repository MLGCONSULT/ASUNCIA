import type { Request, Response, NextFunction } from "express";
import type { User } from "@supabase/supabase-js";
import { getUserFromToken } from "../lib/supabase.js";

export type AuthRequest = Request & { user?: User | null };

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token?.trim()) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  try {
    const user = await getUserFromToken(token.trim());
    if (!user) {
      res.status(401).json({ error: "Token invalide ou expiré" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide" });
  }
}
