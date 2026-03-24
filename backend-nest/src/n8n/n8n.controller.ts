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
import OpenAI from "openai";
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

type N8nGenerateWorkflowBody = {
  prompt?: string;
};

@Controller("n8n")
export class N8nController {
  private extractFirstJsonObject(text: string): string {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1]?.trim() || text.trim();
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return candidate.slice(start, end + 1);
    }
    return candidate;
  }

  private async generateWorkflowJsonInternal(prompt: string) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new HttpException(
        { error: "OPENAI_API_KEY manquante côté serveur." },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    try {
      const openai = new OpenAI({ apiKey });
      const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
      const completion = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content:
              "Tu génères un workflow n8n importable. Réponds avec un objet JSON valide, sans explication. Le JSON doit inclure au minimum: name (string), nodes (array), connections (object), settings (object). Préfère des nodes standards n8n cohérents avec la demande.",
          },
          {
            role: "user",
            content: `Demande workflow: ${prompt}`,
          },
        ],
      });

      const content = completion.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content) {
        throw new Error("Réponse vide du modèle.");
      }
      const jsonText = this.extractFirstJsonObject(content);
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      return {
        json: parsed,
        prettyJson: JSON.stringify(parsed, null, 2),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur génération JSON n8n";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  private ensureAuth(req: AuthRequest): void {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post("generate-workflow-json")
  async generateWorkflowJson(@Req() req: AuthRequest, @Body() body: N8nGenerateWorkflowBody) {
    this.ensureAuth(req);
    const prompt = String(body?.prompt ?? "").trim();
    if (!prompt) {
      throw new HttpException({ error: "Le prompt est requis." }, HttpStatus.BAD_REQUEST);
    }
    return this.generateWorkflowJsonInternal(prompt);
  }

  @Post("generate-mock-json")
  async generateMockJsonCompat(@Req() req: AuthRequest, @Body() body: N8nGenerateWorkflowBody) {
    this.ensureAuth(req);
    const prompt = String(body?.prompt ?? "").trim();
    if (!prompt) {
      throw new HttpException({ error: "Le prompt est requis." }, HttpStatus.BAD_REQUEST);
    }
    return this.generateWorkflowJsonInternal(prompt);
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

