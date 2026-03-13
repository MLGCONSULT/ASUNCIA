import "reflect-metadata";
import type { Express } from "express";
import express from "express";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

let server: Express | null = null;

export async function bootstrapVercel(): Promise<Express> {
  if (server) return server;

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const nestApp = await NestFactory.create(AppModule, adapter);

  // Mapping /api/... → /... pour rester compatible avec le front
  expressApp.use((req: any, _res: any, next: () => void) => {
    if (req.url === "/api" || req.url === "/api/") {
      req.url = "/";
    } else if (req.url && req.url.startsWith("/api/")) {
      req.url = req.url.slice(4) || "/";
    }
    next();
  });

  // Même config globale que main.ts (validation + CORS)
  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  nestApp.enableCors({
    origin: [
      "https://asuncia.vercel.app",
      "http://localhost:3000",
    ],
    credentials: true,
  });

  await nestApp.init();
  server = expressApp;
  return server;
}

