import { Module } from "@nestjs/common";
import { N8nController } from "./n8n.controller";

@Module({
  controllers: [N8nController],
})
export class N8nModule {}

