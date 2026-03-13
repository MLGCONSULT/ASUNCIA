import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { ExpressAdapter } from "@nestjs/platform-express";
import express, { Request, Response } from "express";

let cachedServer: express.Express | null = null;

async function getServer() {
  if (cachedServer) {
    return cachedServer;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);

  await app.init();

  cachedServer = expressApp;
  return cachedServer;
}

export default async function handler(req: Request, res: Response) {
  const server = await getServer();
  return server(req, res);
}

