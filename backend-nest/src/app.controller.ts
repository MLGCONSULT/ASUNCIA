import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      message: "AsuncIA backend NestJS est en ligne.",
      hint: "Les APIs sont disponibles sous /api/... (en prod: https://asuncia-backend.vercel.app/api/...).",
    };
  }
}

