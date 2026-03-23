import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import { callN8nMcpTool, getN8nEditorBaseUrl, isN8nMcpConfigured } from "../mcp/n8n-client";
import { parseMcpResultJson } from "../mcp/result";
import { MCP_ERROR_MESSAGES } from "../config/mcp";
import { callFirstAvailableTool } from "../services/integrations/n8n";

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

type N8nCreateWorkflowBody = {
  name: string;
  nodes?: unknown[];
  connections?: Record<string, unknown>;
  settings?: Record<string, unknown>;
};

type N8nUpdateWorkflowBody = {
  name?: string;
  nodes?: unknown[];
  connections?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  active?: boolean;
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
      const data = parseMcpResultJson<{ workflows?: unknown[]; data?: unknown[] } | unknown[]>(result);
      const workflows = Array.isArray(data)
        ? data
        : ((data as { workflows?: unknown[] }).workflows ??
          (data as { data?: unknown[] }).data ??
          []);
      return { workflows, editorBaseUrl: getN8nEditorBaseUrl() };
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
      const result = await callN8nMcpTool("get_workflow_details", {
        workflow_id: id,
        workflowId: id,
      });
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

  @Post("workflows/:id/activate")
  async activateWorkflow(@Req() req: AuthRequest, @Param() params: N8nWorkflowIdParams) {
    this.ensureAuth(req);
    if (!isN8nMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.n8n }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { id } = params;
      const result = await callFirstAvailableTool(
        ["activate_workflow", "n8n_activate_workflow", "update_workflow"],
        (toolName) => callN8nMcpTool(toolName, { workflowId: id, active: true }),
      );
      const data = parseMcpResultJson(result);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("workflows/:id/deactivate")
  async deactivateWorkflow(@Req() req: AuthRequest, @Param() params: N8nWorkflowIdParams) {
    this.ensureAuth(req);
    if (!isN8nMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.n8n }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { id } = params;
      const result = await callFirstAvailableTool(
        ["deactivate_workflow", "n8n_deactivate_workflow", "update_workflow"],
        (toolName) => callN8nMcpTool(toolName, { workflowId: id, active: false }),
      );
      const data = parseMcpResultJson(result);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("workflows")
  async createWorkflow(@Req() req: AuthRequest, @Body() body: N8nCreateWorkflowBody) {
    this.ensureAuth(req);
    if (!isN8nMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.n8n }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { name, nodes = [], connections = {}, settings = {} } = body;
      const result = await callFirstAvailableTool(
        ["create_workflow", "n8n_create_workflow", "workflow_create"],
        async (toolName) => {
          const paramVariants = [
            { workflowId: undefined, id: undefined, name, nodes, connections, settings, active: false },
            { workflow_id: undefined, name, nodes, connections, settings, active: false },
            { name, nodes, connections, settings },
          ];
          return callFirstAvailableTool(paramVariants.map((_, index) => `${toolName}:${index}`), async (variantKey) => {
            const index = Number(variantKey.split(":")[1]);
            return callN8nMcpTool(toolName, paramVariants[index]);
          });
        },
      );
      const data = parseMcpResultJson(result);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Put("workflows/:id")
  async updateWorkflow(
    @Req() req: AuthRequest,
    @Param() params: N8nWorkflowIdParams,
    @Body() body: N8nUpdateWorkflowBody,
  ) {
    this.ensureAuth(req);
    if (!isN8nMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.n8n }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { id } = params;
      const { name, nodes, connections, settings, active } = body;
      const result = await callFirstAvailableTool(
        ["update_workflow", "n8n_update_full_workflow", "n8n_update_workflow"],
        (toolName) => {
          const args: Record<string, unknown> = { workflowId: id };
          if (name !== undefined) args.name = name;
          if (nodes !== undefined) args.nodes = nodes;
          if (connections !== undefined) args.connections = connections;
          if (settings !== undefined) args.settings = settings;
          if (active !== undefined) args.active = active;
          return callN8nMcpTool(toolName, args);
        },
      );
      const data = parseMcpResultJson(result);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Delete("workflows/:id")
  async deleteWorkflow(@Req() req: AuthRequest, @Param() params: N8nWorkflowIdParams) {
    this.ensureAuth(req);
    if (!isN8nMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.n8n }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { id } = params;
      const result = await callFirstAvailableTool(
        ["delete_workflow", "n8n_delete_workflow"],
        (toolName) => callN8nMcpTool(toolName, { workflowId: id }),
      );
      const data = parseMcpResultJson(result);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }
}

