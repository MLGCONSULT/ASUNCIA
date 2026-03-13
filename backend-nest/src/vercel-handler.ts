import "reflect-metadata";
import type { Express } from "express";
import express from "express";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

let server: Express | null = null;

export async function bootstrapVercel(): Promise<Express> {
  if (server) return server;

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const nestApp = await NestFactory.create(AppModule, adapter);

  // Même mapping /api/... que dans main.ts
  expressApp.use((req: any, _res: any, next: () => void) => {
    if (req.url === "/api" || req.url === "/api/") {
      req.url = "/";
    } else if (req.url && req.url.startsWith("/api/")) {
      req.url = req.url.slice(4) || "/";
    }
    next();
  });

  await nestApp.init();
  server = expressApp;
  return server;
}

