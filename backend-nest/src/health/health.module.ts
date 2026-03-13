import { Module } from "@nestjs/common";
import { HealthMcpController } from "./health-mcp.controller";

@Module({
  controllers: [HealthMcpController],
})
export class HealthModule {}

