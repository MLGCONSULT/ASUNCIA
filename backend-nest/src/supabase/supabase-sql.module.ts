import { Module } from "@nestjs/common";
import { SqlFromPromptController } from "./sql-from-prompt.controller";

@Module({
  controllers: [SqlFromPromptController],
})
export class SupabaseSqlModule {}

