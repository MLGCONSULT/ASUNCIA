import { Module } from "@nestjs/common";
import { GmailController } from "./gmail.controller";

@Module({
  controllers: [GmailController],
})
export class GmailModule {}

