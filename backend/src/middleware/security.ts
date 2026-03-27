import type { Express, Request } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

function getPositiveInt(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function applySecurityMiddlewares(app: Express): void {
  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    })
  );

  const globalLimiter = rateLimit({
    windowMs: getPositiveInt("RATE_LIMIT_WINDOW_MS", 60_000),
    max: getPositiveInt("RATE_LIMIT_MAX_REQUESTS", 120),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Trop de requêtes, réessayez dans un instant." },
  });

  const sensitiveLimiter = rateLimit({
    windowMs: getPositiveInt("RATE_LIMIT_SENSITIVE_WINDOW_MS", 60_000),
    max: getPositiveInt("RATE_LIMIT_SENSITIVE_MAX_REQUESTS", 30),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Trop de requêtes sensibles, réessayez dans un instant." },
    keyGenerator: (req: Request) => {
      const auth = req.headers.authorization ?? "";
      return auth || req.ip || "unknown";
    },
  });

  app.use("/api", globalLimiter);
  app.use("/api/chat", sensitiveLimiter);
  app.use("/api/mcp", sensitiveLimiter);
  app.use("/api/auth", sensitiveLimiter);
}
