import type { SupabaseClient } from "@supabase/supabase-js";
import { callMcpTool } from "../mcp/supabase-client";
import { callN8nMcpTool, isN8nMcpConfigured, normalizeExecuteWorkflowInputs } from "../mcp/n8n-client";
import { callAirtableMcpTool, isAirtableMcpConfigured } from "../mcp/airtable-client";
import { mcpResultToText } from "../mcp/result";
import { MCP_ERROR_MESSAGES } from "../config/mcp";
import { getAirtableRuntimeAccess } from "../services/integrations/airtable";

export type ToolContext = { supabase: SupabaseClient; userId: string };

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const { supabase, userId } = ctx;
  try {
    switch (name) {
      case "mcp_supabase": {
        const toolName = String(args.toolName ?? "").trim();
        const toolArgs = (args.arguments as Record<string, unknown>) ?? {};
        if (!toolName) return "toolName requis.";
        const result = await callMcpTool(toolName, toolArgs);
        return mcpResultToText(result);
      }
      case "mcp_n8n": {
        const toolName = String(args.toolName ?? "").trim();
        const toolArgs = (args.arguments as Record<string, unknown>) ?? {};
        if (!toolName) return "toolName requis.";
        if (!isN8nMcpConfigured()) return MCP_ERROR_MESSAGES.n8n;
        let finalArgs: Record<string, unknown> = toolArgs;
        if (toolName === "execute_workflow") {
          finalArgs = { ...toolArgs, inputs: normalizeExecuteWorkflowInputs(toolArgs.inputs) };
        } else if (toolName === "get_workflow_details") {
          const wid = String(toolArgs.workflowId ?? toolArgs.workflow_id ?? "").trim();
          finalArgs = { workflowId: wid };
        }
        const result = await callN8nMcpTool(toolName, finalArgs);
        return mcpResultToText(result);
      }
      case "mcp_airtable": {
        const toolName = String(args.toolName ?? "").trim();
        const toolArgs = (args.arguments as Record<string, unknown>) ?? {};
        if (!toolName) return "toolName requis.";
        if (!isAirtableMcpConfigured()) return MCP_ERROR_MESSAGES.airtable;
        const runtime = await getAirtableRuntimeAccess({ supabase, userId });
        if (!runtime.available)
          return "Airtable non connecté. L'utilisateur peut se connecter depuis la page Airtable.";
        const result = await callAirtableMcpTool(toolName, toolArgs, runtime.accessToken);
        return mcpResultToText(result);
      }
      case "airtable_list_bases": {
        if (!isAirtableMcpConfigured()) return MCP_ERROR_MESSAGES.airtable;
        const runtime = await getAirtableRuntimeAccess({ supabase, userId });
        if (!runtime.available) return "Airtable n'est pas connecté.";
        const result = await callAirtableMcpTool("list_bases", {}, runtime.accessToken);
        return mcpResultToText(result);
      }
      case "airtable_list_records": {
        if (!isAirtableMcpConfigured()) return MCP_ERROR_MESSAGES.airtable;
        const baseId = String(args.baseId ?? "").trim();
        const tableId = String(args.tableId ?? "").trim();
        const pageSize = Math.min(Number(args.maxRecords) || 20, 100);
        if (!baseId || !tableId) return "baseId et tableId requis.";
        const runtime = await getAirtableRuntimeAccess({ supabase, userId });
        if (!runtime.available) return "Airtable n'est pas connecté.";
        const result = await callAirtableMcpTool(
          "list_records_for_table",
          { baseId, tableId, pageSize },
          runtime.accessToken,
        );
        return mcpResultToText(result);
      }
      case "n8n_search_workflows": {
        if (!isN8nMcpConfigured()) return MCP_ERROR_MESSAGES.n8n;
        const query = typeof args.query === "string" ? args.query.trim() : undefined;
        const rawLimit = Number(args.limit);
        const limit = Number.isFinite(rawLimit) ? Math.min(200, Math.max(1, Math.floor(rawLimit))) : 20;
        const projectId =
          typeof args.projectId === "string" && args.projectId.trim() !== "" ? args.projectId.trim() : undefined;
        const result = await callN8nMcpTool("search_workflows", {
          ...(query !== undefined && query !== "" ? { query } : {}),
          limit,
          ...(projectId ? { projectId } : {}),
        });
        return mcpResultToText(result);
      }
      case "n8n_get_workflow_details": {
        if (!isN8nMcpConfigured()) return MCP_ERROR_MESSAGES.n8n;
        const workflowId = String(args.workflowId ?? "").trim();
        if (!workflowId) return "workflowId requis.";
        const result = await callN8nMcpTool("get_workflow_details", { workflowId });
        return mcpResultToText(result);
      }
      case "n8n_execute_workflow": {
        if (!isN8nMcpConfigured()) return MCP_ERROR_MESSAGES.n8n;
        const workflowId = String(args.workflowId ?? "").trim();
        const inputs = args.inputs as Record<string, unknown> | undefined;
        if (!workflowId) return "workflowId requis.";
        const result = await callN8nMcpTool("execute_workflow", {
          workflowId,
          inputs: normalizeExecuteWorkflowInputs(inputs),
        });
        return mcpResultToText(result);
      }
      default:
        return `Tool inconnu: ${name}`;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Erreur (${name}): ${message}`;
  }
}

