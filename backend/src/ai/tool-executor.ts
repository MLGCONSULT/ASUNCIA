import type { SupabaseClient } from "@supabase/supabase-js";
import { callMcpTool } from "../mcp/supabase-client.js";
import { callN8nMcpTool, isN8nMcpConfigured } from "../mcp/n8n-client.js";
import { callGmailMcpTool, isGmailMcpConfigured } from "../mcp/gmail-client.js";
import { callAirtableMcpTool, isAirtableMcpConfigured } from "../mcp/airtable-client.js";
import { callNotionMcpTool, getNotionMcpToolNames, isNotionMcpConfigured } from "../mcp/notion-client.js";
import { mcpResultToText } from "../mcp/result.js";
import { MCP_ERROR_MESSAGES } from "../config/mcp.js";
import { getAirtableRuntimeAccess } from "../services/integrations/airtable.js";
import { getGmailAccessTokenForContext } from "../services/integrations/gmail.js";
import { getNotionRuntimeAccess } from "../services/integrations/notion.js";

export type ToolContext = { supabase: SupabaseClient; userId: string };

export async function executeTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
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
        const result = await callN8nMcpTool(toolName, toolArgs);
        return mcpResultToText(result);
      }
      case "mcp_gmail": {
        const toolName = String(args.toolName ?? "").trim();
        const toolArgs = (args.arguments as Record<string, unknown>) ?? {};
        if (!toolName) return "toolName requis.";
        if (!isGmailMcpConfigured()) return MCP_ERROR_MESSAGES.gmail;
        const accessToken = await getGmailAccessTokenForContext({ supabase, userId });
        if (!accessToken) return "Impossible d'accéder à Gmail. Reconnecter depuis la page Mails.";
        const result = await callGmailMcpTool(toolName, toolArgs, accessToken);
        return mcpResultToText(result);
      }
      case "mcp_airtable": {
        const toolName = String(args.toolName ?? "").trim();
        const toolArgs = (args.arguments as Record<string, unknown>) ?? {};
        if (!toolName) return "toolName requis.";
        if (!isAirtableMcpConfigured()) return MCP_ERROR_MESSAGES.airtable;
        const runtime = await getAirtableRuntimeAccess({ supabase, userId });
        if (!runtime.available) return "Airtable non connecté. L'utilisateur peut se connecter depuis la page Airtable.";
        const result = await callAirtableMcpTool(toolName, toolArgs, runtime.accessToken);
        return mcpResultToText(result);
      }
      case "mcp_notion": {
        const toolName = String(args.toolName ?? "").trim();
        const toolArgs = (args.arguments as Record<string, unknown>) ?? {};
        if (!toolName) return "toolName requis.";
        if (!isNotionMcpConfigured()) return MCP_ERROR_MESSAGES.notion;
        const runtime = await getNotionRuntimeAccess({ supabase, userId });
        if (!runtime.available) return "Notion non connecté. L'utilisateur peut connecter Notion depuis les paramètres (OAuth).";
        const result = await callNotionMcpTool(toolName, toolArgs, runtime.accessToken);
        return mcpResultToText(result);
      }
      case "gmail_list_messages": {
        if (!isGmailMcpConfigured()) return MCP_ERROR_MESSAGES.gmail;
        const accessToken = await getGmailAccessTokenForContext({ supabase, userId });
        if (!accessToken) return "Impossible d'accéder à Gmail.";
        const maxResults = Math.min(Number(args.maxResults) || 15, 30);
        const result = await callGmailMcpTool("list_messages", { max_results: maxResults }, accessToken);
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
        const maxRecords = Math.min(Number(args.maxRecords) || 20, 50);
        if (!baseId || !tableId) return "baseId et tableId requis.";
        const runtime = await getAirtableRuntimeAccess({ supabase, userId });
        if (!runtime.available) return "Airtable n'est pas connecté.";
        const result = await callAirtableMcpTool(
          "list_records",
          { base_id: baseId, table_id: tableId, max_records: maxRecords },
          runtime.accessToken
        );
        return mcpResultToText(result);
      }
      case "notion_search": {
        if (!isNotionMcpConfigured()) return MCP_ERROR_MESSAGES.notion;
        const runtime = await getNotionRuntimeAccess({ supabase, userId });
        if (!runtime.available) return "Notion n'est pas connecté. L'utilisateur peut le connecter depuis les paramètres.";
        const { search: searchTool } = getNotionMcpToolNames();
        const filterType = args.filterType as "database" | "page" | undefined;
        const query = typeof args.query === "string" ? args.query.trim() : "";
        const toolArgs =
          searchTool === "notion-search"
            ? { query: query.length > 0 ? query : " ", ...(filterType && { filter_type: filterType }) }
            : filterType ? { filter_type: filterType } : {};
        const result = await callNotionMcpTool(searchTool, toolArgs, runtime.accessToken);
        return mcpResultToText(result);
      }
      case "notion_query_database": {
        if (!isNotionMcpConfigured()) return MCP_ERROR_MESSAGES.notion;
        const runtime = await getNotionRuntimeAccess({ supabase, userId });
        if (!runtime.available) return "Notion n'est pas connecté.";
        const databaseId = String(args.databaseId ?? "").trim();
        const pageSize = Math.min(Number(args.pageSize) || 20, 50);
        if (!databaseId) return "databaseId requis.";
        const { queryDatabase: queryTool } = getNotionMcpToolNames();
        const result = await callNotionMcpTool(
          queryTool,
          queryTool === "query-data-source"
            ? { data_source_id: databaseId, page_size: pageSize }
            : { database_id: databaseId, page_size: pageSize },
          runtime.accessToken
        );
        return mcpResultToText(result);
      }
      case "n8n_search_workflows": {
        if (!isN8nMcpConfigured()) return MCP_ERROR_MESSAGES.n8n;
        const query = typeof args.query === "string" ? args.query.trim() : undefined;
        const limit = Math.min(Number(args.limit) || 20, 50);
        const result = await callN8nMcpTool("search_workflows", { query, limit });
        return mcpResultToText(result);
      }
      case "n8n_get_workflow_details": {
        if (!isN8nMcpConfigured()) return MCP_ERROR_MESSAGES.n8n;
        const workflowId = String(args.workflowId ?? "").trim();
        if (!workflowId) return "workflowId requis.";
        const result = await callN8nMcpTool("get_workflow_details", { workflow_id: workflowId });
        return mcpResultToText(result);
      }
      case "n8n_execute_workflow": {
        if (!isN8nMcpConfigured()) return MCP_ERROR_MESSAGES.n8n;
        const workflowId = String(args.workflowId ?? "").trim();
        const inputs = args.inputs as Record<string, unknown> | undefined;
        if (!workflowId) return "workflowId requis.";
        const result = await callN8nMcpTool("execute_workflow", { workflowId, ...(inputs ? { inputs } : {}) });
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
