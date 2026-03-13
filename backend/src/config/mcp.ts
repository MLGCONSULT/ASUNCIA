/**
 * Configuration centralisée des serveurs MCP (un par outil).
 * Aucune API REST n'est utilisée pour ces outils : uniquement MCP.
 *
 * Variables d'environnement requises :
 *
 * - n8n    : N8N_MCP_URL, N8N_MCP_ACCESS_TOKEN
 * - gmail  : GMAIL_MCP_URL (token = OAuth utilisateur, passé à l'appel)
 * - airtable : AIRTABLE_MCP_URL, AIRTABLE_MCP_TOKEN ou AIRTABLE_TOKEN
 * - notion : OAuth dans l'app (NOTION_OAUTH_REDIRECT_URI) ou NOTION_MCP_TOKEN pour serveur open-source
 */

import { isN8nMcpConfigured } from "../mcp/n8n-client.js";
import { isGmailMcpConfigured } from "../mcp/gmail-client.js";
import { isAirtableMcpConfigured } from "../mcp/airtable-client.js";
import { isNotionMcpConfigured } from "../mcp/notion-client.js";
import { isSupabaseMcpConfigured } from "../mcp/supabase-client.js";

export const MCP = {
  supabase: {
    envVars: ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF ou NEXT_PUBLIC_SUPABASE_URL"],
    isConfigured: isSupabaseMcpConfigured,
  },
  n8n: {
    envVars: ["N8N_MCP_URL", "N8N_MCP_ACCESS_TOKEN"],
    isConfigured: isN8nMcpConfigured,
  },
  gmail: {
    envVars: ["GMAIL_MCP_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "Scope OAuth lecture + envoi"],
    isConfigured: isGmailMcpConfigured,
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
  supabase: "Configurez le MCP Supabase : SUPABASE_ACCESS_TOKEN et SUPABASE_PROJECT_REF (ou NEXT_PUBLIC_SUPABASE_URL) dans .env",
  n8n: "Configurez le serveur MCP n8n : N8N_MCP_URL et N8N_MCP_ACCESS_TOKEN dans .env",
  gmail: "Configurez Gmail : GMAIL_MCP_URL, GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env, avec un scope OAuth lecture + envoi.",
  airtable:
    "Configurez Airtable : AIRTABLE_MCP_URL, AIRTABLE_RUNTIME_MODE puis soit AIRTABLE_OAUTH_CLIENT_ID, soit AIRTABLE_MCP_TOKEN/AIRTABLE_TOKEN dans .env.",
  notion:
    "Configurez Notion : NOTION_MCP_URL, NOTION_RUNTIME_MODE puis soit NOTION_OAUTH_REDIRECT_URI/NOTION_OAUTH_CLIENT_ID, soit NOTION_MCP_TOKEN dans .env.",
} as const;
