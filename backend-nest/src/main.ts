import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { attachUserFromAuthHeader } from "./middleware/auth-user";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Attacher l'utilisateur depuis Authorization: Bearer ... si présent
  app.use(attachUserFromAuthHeader as any);

  // Compatibilité API: autoriser les chemins /api/... en les mappant sur /
  app.use((req: any, _res: any, next: () => void) => {
    if (req.url === "/api" || req.url === "/api/") {
      req.url = "/";
    } else if (req.url && req.url.startsWith("/api/")) {
      req.url = req.url.slice(4) || "/";
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: "*",
    credentials: true,
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Nest backend listening on http://localhost:${port}`);
}

bootstrap();

