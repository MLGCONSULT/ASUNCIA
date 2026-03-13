import { Module } from "@nestjs/common";
import { AirtableAuthController } from "./airtable-auth.controller";

@Module({
  controllers: [AirtableAuthController],
})
export class AuthModule {}

