import type { Request, Response, NextFunction } from "express";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
].filter(Boolean) as string[];

const EXTRA_ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(
  new Set([...DEFAULT_ALLOWED_ORIGINS, ...EXTRA_ALLOWED_ORIGINS])
);

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  const allowPreviewOrigins =
    process.env.ALLOW_VERCEL_PREVIEW_ORIGINS === "true" &&
    !!origin?.endsWith(".vercel.app");

  if (origin && (ALLOWED_ORIGINS.includes(origin) || allowPreviewOrigins)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (ALLOWED_ORIGINS.length > 0) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0]!);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}
