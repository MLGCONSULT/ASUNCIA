import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/index.js";

/** Point d'entrée Vercel : délègue à l'app Express. */
export default function handler(req: VercelRequest, res: VercelResponse): void {
  // Vercel req/res sont compatibles avec la signature Express pour ce usage
  app(req as unknown as Parameters<typeof app>[0], res as unknown as Parameters<typeof app>[1]);
}
