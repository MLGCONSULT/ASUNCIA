import type { SupabaseClient } from "@supabase/supabase-js";
import { callMcpTool } from "../mcp/supabase-client";
import { callN8nMcpTool, isN8nMcpConfigured } from "../mcp/n8n-client";
import { callAirtableMcpTool, isAirtableMcpConfigured } from "../mcp/airtable-client";
import {
  callNotionMcpTool,
  getNotionMcpToolNames,
  isNotionMcpConfigured,
} from "../mcp/notion-client";
import { mcpResultToText } from "../mcp/result";
import { MCP_ERROR_MESSAGES } from "../config/mcp";
import { getAirtableRuntimeAccess } from "../services/integrations/airtable";
import { getNotionRuntimeAccess } from "../services/integrations/notion";

export type ToolContext = { supabase: SupabaseClient; userId: string };

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const { supabase, userId } = ctx;
  try {
    switch (name) {
      case "list_leads": {
        const { data, error } = await supabase
          .from("leads")
          .select("id, nom, email, statut, date_creation")
          .order("date_creation", { ascending: false })
          .limit(50);
        if (error) return `Erreur leads: ${error.message}`;
        return JSON.stringify(data ?? [], null, 2);
      }
      case "create_lead": {
        const nom = String(args.nom ?? "").trim();
        const email = String(args.email ?? "").trim();
        const statut = (args.statut as string) ?? "nouveau";
        if (!nom || !email) return "Nom et email sont requis.";
        const { data, error } = await supabase
          .from("leads")
          .insert({ nom, email, statut, utilisateur_id: userId })
          .select("id, nom, email, statut")
          .single();
        if (error) return `Erreur: ${error.message}`;
        return `Lead créé: ${JSON.stringify(data)}`;
      }
      case "update_lead": {
        const id = String(args.id ?? "").trim();
        if (!id) return "ID du lead requis.";
        const updates: Record<string, unknown> = {};
        if (args.nom != null) updates.nom = String(args.nom);
        if (args.email != null) updates.email = String(args.email);
        if (args.statut != null) updates.statut = args.statut;
        if (Object.keys(updates).length === 0) return "Aucun champ à mettre à jour.";
        const { data, error } = await supabase
          .from("leads")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (error) return `Erreur: ${error.message}`;
        return `Lead mis à jour: ${JSON.stringify(data)}`;
      }
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
      case "mcp_notion": {
        const toolName = String(args.toolName ?? "").trim();
        const toolArgs = (args.arguments as Record<string, unknown>) ?? {};
        if (!toolName) return "toolName requis.";
        if (!isNotionMcpConfigured()) return MCP_ERROR_MESSAGES.notion;
        const runtime = await getNotionRuntimeAccess({ supabase, userId });
        if (!runtime.available)
          return "Notion non connecté. L'utilisateur peut connecter Notion depuis les paramètres (OAuth).";
        const result = await callNotionMcpTool(toolName, toolArgs, runtime.accessToken);
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
          runtime.accessToken,
        );
        return mcpResultToText(result);
      }
      case "notion_search": {
        if (!isNotionMcpConfigured()) return MCP_ERROR_MESSAGES.notion;
        const runtime = await getNotionRuntimeAccess({ supabase, userId });
        if (!runtime.available)
          return "Notion n'est pas connecté. L'utilisateur peut le connecter depuis les paramètres.";
        const { search: searchTool } = getNotionMcpToolNames();
        const filterType = args.filterType as "database" | "page" | undefined;
        const query = typeof args.query === "string" ? args.query.trim() : "";
        const toolArgs =
          searchTool === "notion-search"
            ? { query: query.length > 0 ? query : " ", ...(filterType && { filter_type: filterType }) }
            : filterType
              ? { filter_type: filterType }
              : {};
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
          runtime.accessToken,
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
        const result = await callN8nMcpTool("execute_workflow", {
          workflowId,
          ...(inputs ? { inputs } : {}),
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

