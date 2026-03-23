import { isN8nMcpConfigured } from "../mcp/n8n-client";
import { isAirtableMcpConfigured } from "../mcp/airtable-client";
import { isNotionMcpConfigured } from "../mcp/notion-client";
import { isSupabaseMcpConfigured } from "../mcp/supabase-client";

export const MCP = {
  supabase: {
    envVars: ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF ou NEXT_PUBLIC_SUPABASE_URL"],
    isConfigured: isSupabaseMcpConfigured,
  },
  n8n: {
    envVars: ["N8N_MCP_URL", "N8N_MCP_ACCESS_TOKEN"],
    isConfigured: isN8nMcpConfigured,
  },
  airtable: {
    envVars: [
      "AIRTABLE_MCP_URL",
      "AIRTABLE_RUNTIME_MODE=oauth|server-token|auto",
      "AIRTABLE_OAUTH_CLIENT_ID ou AIRTABLE_MCP_TOKEN/AIRTABLE_TOKEN",
    ],
    isConfigured: isAirtableMcpConfigured,
  },
  notion: {
    envVars: [
      "NOTION_MCP_URL",
      "NOTION_RUNTIME_MODE=oauth|server-token|auto",
      "NOTION_OAUTH_REDIRECT_URI / NOTION_OAUTH_CLIENT_ID ou NOTION_MCP_TOKEN",
    ],
    isConfigured: isNotionMcpConfigured,
  },
} as const;

export const MCP_ERROR_MESSAGES = {
  supabase:
    "Configurez le MCP Supabase : SUPABASE_ACCESS_TOKEN et SUPABASE_PROJECT_REF (ou NEXT_PUBLIC_SUPABASE_URL) dans .env",
  n8n: "Configurez le serveur MCP n8n : N8N_MCP_URL et N8N_MCP_ACCESS_TOKEN dans .env",
  airtable:
    "Configurez Airtable : AIRTABLE_MCP_URL, AIRTABLE_RUNTIME_MODE puis soit AIRTABLE_OAUTH_CLIENT_ID, soit AIRTABLE_MCP_TOKEN/AIRTABLE_TOKEN dans .env.",
  notion:
    "Configurez Notion : NOTION_MCP_URL, NOTION_RUNTIME_MODE puis soit NOTION_OAUTH_REDIRECT_URI/NOTION_OAUTH_CLIENT_ID, soit NOTION_MCP_TOKEN dans .env.",
} as const;

