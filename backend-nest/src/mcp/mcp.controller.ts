import { Body, Controller, Get, HttpException, HttpStatus, Post } from "@nestjs/common";
import { IsObject, IsOptional, IsString } from "class-validator";
import { callMcpTool, listMcpTools } from "./supabase-client";

type McpTool = { name?: string; description?: string };

class McpCallDto {
  @IsString()
  toolName!: string;

  @IsOptional()
  @IsObject()
  arguments?: Record<string, unknown>;
}

function normalizeTools(result: unknown): { name: string; description?: string }[] {
  const list = (result as { tools?: McpTool[] })?.tools;
  if (!Array.isArray(list)) return [];
  return list.map((t) => ({ name: t?.name ?? "", description: t?.description }));
}

@Controller("mcp")
export class McpController {
  @Get("tools")
  async getTools() {
    try {
      const result = await listMcpTools();
      return { tools: normalizeTools(result) };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur MCP";
      throw new HttpException({ error: message, tools: [] }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("call")
  async callTool(@Body() body: McpCallDto) {
    if (!body?.toolName) {
      throw new HttpException({ error: "toolName requis" }, HttpStatus.BAD_REQUEST);
    }
    try {
      if (body.toolName === "list_tools") {
        const result = await listMcpTools();
        return { tools: normalizeTools(result) };
      }
      const result = await callMcpTool(body.toolName, body.arguments ?? {});
      return {
        content: (result as { content?: unknown }).content,
        isError: (result as { isError?: boolean }).isError,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur MCP";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }
}

