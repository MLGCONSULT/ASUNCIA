import type { Request, Response, NextFunction } from "express";
import type { User } from "@supabase/supabase-js";
import { getUserFromToken } from "../lib/supabase";

export type AuthRequest = Request & { user?: User | null };

export async function attachUserFromAuthHeader(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return next();
  }
  try {
    const user = await getUserFromToken(token);
    if (user) {
      req.user = user;
    }
  } catch {
    // En cas d'erreur de token, on n'attache pas d'utilisateur.
  }
  next();
}

