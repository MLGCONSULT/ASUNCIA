// @ts-nocheck
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { bootstrapVercel } from "../dist/vercel-handler";

// Handler Vercel: délègue au bootstrap Nest.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await bootstrapVercel();
  app(req as any, res as any);
}

