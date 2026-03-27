import { Router } from "express";
import { callN8nMcpTool, isN8nMcpConfigured, normalizeExecuteWorkflowInputs } from "../mcp/n8n-client.js";
import { mergeGetWorkflowDetailsMcpPayload, parseMcpResultJson } from "../mcp/result.js";
import { MCP_ERROR_MESSAGES } from "../config/mcp.js";
import { callFirstAvailableTool } from "../services/integrations/n8n.js";
import { createUserSupabaseFromRequest } from "../services/auth-context.js";
import { getUserMcpConfig } from "../services/user-mcp-config.js";
import { parseBody, parseParams, parseQuery } from "../validators/http.js";
import {
  n8nCreateWorkflowBodySchema,
  n8nExecuteBodySchema,
  n8nUpdateWorkflowBodySchema,
  n8nWorkflowIdParamsSchema,
  n8nWorkflowsQuerySchema,
} from "../validators/schemas.js";
import type { AuthRequest } from "../middleware/auth.js";

export function n8nRouter(): Router {
  const router = Router();

  async function getUserN8nRuntime(req: AuthRequest) {
    if (!req.user) return {};
    const cfg = await getUserMcpConfig(createUserSupabaseFromRequest(req), req.user.id);
    return {
      url: cfg.n8n?.mcpUrl,
      token: cfg.n8n?.accessToken,
    };
  }

  router.get("/workflows", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const runtime = await getUserN8nRuntime(req);
      if (!isN8nMcpConfigured(runtime)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.n8n });
        return;
      }
      const { query, limit, projectId } = parseQuery(n8nWorkflowsQuerySchema, req);
      const result = await callN8nMcpTool("search_workflows", {
        ...(query ? { query } : {}),
        limit,
        ...(projectId ? { projectId } : {}),
      }, runtime);
      const data = parseMcpResultJson<{ workflows?: unknown[]; data?: unknown[] } | unknown[]>(result);
      const workflows = Array.isArray(data)
        ? data
        : ((data as { workflows?: unknown[] }).workflows ?? (data as { data?: unknown[] }).data ?? []);
      res.json({ workflows });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      res.status(502).json({ error: message });
    }
  });

  router.get("/workflows/:id", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const runtime = await getUserN8nRuntime(req);
      if (!isN8nMcpConfigured(runtime)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.n8n });
        return;
      }
      const { id } = parseParams(n8nWorkflowIdParamsSchema, req);
      const result = await callN8nMcpTool("get_workflow_details", { workflowId: id }, runtime);
      const parsed = parseMcpResultJson<Record<string, unknown>>(result);
      const data =
        parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
          ? mergeGetWorkflowDetailsMcpPayload(result, parsed)
          : parsed;
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      res.status(502).json({ error: message });
    }
  });

  router.post("/workflows/:id/execute", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const runtime = await getUserN8nRuntime(req);
      if (!isN8nMcpConfigured(runtime)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.n8n });
        return;
      }
      const { id } = parseParams(n8nWorkflowIdParamsSchema, req);
      const body = parseBody(n8nExecuteBodySchema, req);
      const inputs = body.inputs ?? (typeof req.body === "object" && req.body !== null ? req.body : undefined);
      const inputsObj =
        typeof inputs === "object" && inputs !== null && !Array.isArray(inputs) ? inputs : undefined;
      const result = await callN8nMcpTool("execute_workflow", {
        workflowId: id,
        inputs: normalizeExecuteWorkflowInputs(inputsObj),
      }, runtime);
      const data = parseMcpResultJson(result);
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      res.status(502).json({ error: message });
    }
  });

  router.post("/workflows/:id/activate", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const runtime = await getUserN8nRuntime(req);
      if (!isN8nMcpConfigured(runtime)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.n8n });
        return;
      }
      const { id } = parseParams(n8nWorkflowIdParamsSchema, req);
      const result = await callFirstAvailableTool(
        ["activate_workflow", "n8n_activate_workflow", "update_workflow"],
        (toolName) => callN8nMcpTool(toolName, { workflowId: id, active: true }, runtime)
      );
      const data = parseMcpResultJson(result);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      res.status(502).json({ error: message });
    }
  });

  router.post("/workflows/:id/deactivate", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const runtime = await getUserN8nRuntime(req);
      if (!isN8nMcpConfigured(runtime)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.n8n });
        return;
      }
      const { id } = parseParams(n8nWorkflowIdParamsSchema, req);
      const result = await callFirstAvailableTool(
        ["deactivate_workflow", "n8n_deactivate_workflow", "update_workflow"],
        (toolName) => callN8nMcpTool(toolName, { workflowId: id, active: false }, runtime)
      );
      const data = parseMcpResultJson(result);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      res.status(502).json({ error: message });
    }
  });

  router.post("/workflows", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const runtime = await getUserN8nRuntime(req);
      if (!isN8nMcpConfigured(runtime)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.n8n });
        return;
      }
      const { name, nodes = [], connections = {}, settings = {} } = parseBody(n8nCreateWorkflowBodySchema, req);
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
            return callN8nMcpTool(toolName, paramVariants[index], runtime);
          });
        }
      );
      const data = parseMcpResultJson(result);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      res.status(502).json({ error: message });
    }
  });

  router.put("/workflows/:id", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const runtime = await getUserN8nRuntime(req);
      if (!isN8nMcpConfigured(runtime)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.n8n });
        return;
      }
      const { id } = parseParams(n8nWorkflowIdParamsSchema, req);
      const { name, nodes, connections, settings, active } = parseBody(n8nUpdateWorkflowBodySchema, req);
      const result = await callFirstAvailableTool(
        ["update_workflow", "n8n_update_full_workflow", "n8n_update_workflow"],
        (toolName) => {
          const args: Record<string, unknown> = { workflowId: id };
          if (name !== undefined) args.name = name;
          if (nodes !== undefined) args.nodes = nodes;
          if (connections !== undefined) args.connections = connections;
          if (settings !== undefined) args.settings = settings;
          if (active !== undefined) args.active = active;
          return callN8nMcpTool(toolName, args, runtime);
        }
      );
      const data = parseMcpResultJson(result);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      res.status(502).json({ error: message });
    }
  });

  router.delete("/workflows/:id", async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    try {
      const runtime = await getUserN8nRuntime(req);
      if (!isN8nMcpConfigured(runtime)) {
        res.status(503).json({ error: MCP_ERROR_MESSAGES.n8n });
        return;
      }
      const { id } = parseParams(n8nWorkflowIdParamsSchema, req);
      const result = await callFirstAvailableTool(
        ["delete_workflow", "n8n_delete_workflow"],
        (toolName) => callN8nMcpTool(toolName, { workflowId: id }, runtime)
      );
      const data = parseMcpResultJson(result);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      res.status(502).json({ error: message });
    }
  });

  return router;
}
