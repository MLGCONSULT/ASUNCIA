import { Router } from "express";
import type { AuthRequest } from "../middleware/auth.js";

export function deconnexionRouter(): Router {
  const router = Router();
  router.post("/", (_req: AuthRequest, res) => {
    res.json({ ok: true });
  });
  return router;
}
