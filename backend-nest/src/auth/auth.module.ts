import { Module } from "@nestjs/common";
import { AirtableAuthController } from "./airtable-auth.controller";
import { NotionAuthController } from "./notion-auth.controller";

@Module({
  controllers: [AirtableAuthController, NotionAuthController],
})
export class AuthModule {}

