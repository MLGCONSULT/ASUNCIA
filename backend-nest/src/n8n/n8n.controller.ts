import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import { callN8nMcpTool, getN8nEditorBaseUrl, isN8nMcpConfigured } from "../mcp/n8n-client";
import { parseMcpResultJson } from "../mcp/result";
import { MCP_ERROR_MESSAGES } from "../config/mcp";

type AuthRequest = Request & { user?: { id: string } };

type N8nWorkflowsQuery = {
  query?: string;
  limit?: number | string;
};

type N8nWorkflowIdParams = {
  id: string;
};

type N8nExecuteBody = {
  inputs?: unknown;
};

@Controller("n8n")
export class N8nController {
  private ensureAuth(req: AuthRequest): void {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
  }

  @Get("workflows")
  async listWorkflows(@Req() req: AuthRequest) {
    this.ensureAuth(req);
    if (!isN8nMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.n8n }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { query, limit } = (req.query || {}) as N8nWorkflowsQuery;
      const normalizedLimit =
        typeof limit === "number"
          ? limit
          : typeof limit === "string" && limit.trim() !== ""
            ? Number(limit)
            : undefined;
      const result = await callN8nMcpTool("search_workflows", {
        query,
        ...(Number.isFinite(normalizedLimit) ? { limit: normalizedLimit } : {}),
      });
      const data = parseMcpResultJson<{ data?: unknown[]; count?: number } | unknown[]>(result);
      const workflows = Array.isArray(data)
        ? data
        : ((data as { data?: unknown[] }).data ?? []);
      const count = Array.isArray(data) ? data.length : (typeof (data as { count?: number }).count === "number" ? (data as { count: number }).count : workflows.length);
      return { workflows, count, editorBaseUrl: getN8nEditorBaseUrl() };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("workflows/:id")
  async getWorkflow(@Req() req: AuthRequest, @Param() params: N8nWorkflowIdParams) {
    this.ensureAuth(req);
    if (!isN8nMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.n8n }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { id } = params;
      const result = await callN8nMcpTool("get_workflow_details", { workflowId: id });
      const data = parseMcpResultJson(result);
      const editorBaseUrl = getN8nEditorBaseUrl();
      if (data !== null && typeof data === "object" && !Array.isArray(data)) {
        return { ...(data as Record<string, unknown>), editorBaseUrl };
      }
      return { data, editorBaseUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("workflows/:id/execute")
  async executeWorkflow(
    @Req() req: AuthRequest,
    @Param() params: N8nWorkflowIdParams,
    @Body() body: N8nExecuteBody,
  ) {
    this.ensureAuth(req);
    if (!isN8nMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.n8n }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { id } = params;
      const inputs = body.inputs ?? (typeof req.body === "object" && req.body !== null ? req.body : undefined);
      const inputsObj = typeof inputs === "object" && inputs !== null ? inputs : undefined;
      const result = await callN8nMcpTool("execute_workflow", {
        workflowId: id,
        ...(inputsObj ? { inputs: inputsObj } : {}),
      });
      const data = parseMcpResultJson(result);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }
}

