import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getNestServer } from "../src/bootstrap.js";

/** Point d'entrée Vercel : délègue à l'app Nest/Express. */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const app = await getNestServer();
  app(req as unknown as Parameters<typeof app>[0], res as unknown as Parameters<typeof app>[1]);
}
