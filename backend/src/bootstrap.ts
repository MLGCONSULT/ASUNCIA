import "reflect-metadata";
import type express from "express";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import legacyApp from "./index.js";

let server: express.Express | null = null;

export async function getNestServer() {
  if (server) return server;

  const nestApp = await NestFactory.create(AppModule);
  const instance = nestApp.getHttpAdapter().getInstance() as express.Express;

  // Monte toutes les routes / middlewares Express existants sous le serveur Nest.
  instance.use(legacyApp);

  await nestApp.init();
  server = instance;
  return server;
}

