import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const OFFICIAL_NOTION_MCP = "https://mcp.notion.com/mcp";
type NotionRuntimeMode = "auto" | "oauth" | "server-token";

function getNotionMcpUrl(): string {
  return process.env.NOTION_MCP_URL?.trim() || OFFICIAL_NOTION_MCP;
}

function getRawNotionEnvToken(): string | undefined {
  return process.env.NOTION_MCP_TOKEN?.trim() || process.env.NOTION_API_KEY?.trim() || undefined;
}

export function getNotionRuntimeMode(): NotionRuntimeMode {
  const mode = process.env.NOTION_RUNTIME_MODE?.trim().toLowerCase();
  if (mode === "oauth" || mode === "server-token") {
    return mode;
  }
  return "auto";
}

/** Noms d'outils selon le serveur : MCP officiel utilise notion-search / query-data-source. */
export function getNotionMcpToolNames(): { search: string; queryDatabase: string } {
  const url = (process.env.NOTION_MCP_URL?.trim() || OFFICIAL_NOTION_MCP).toLowerCase();
  const isOfficial = url.includes("mcp.notion.com");
  return {
    search: isOfficial ? "notion-search" : "search",
    queryDatabase: isOfficial ? "query-data-source" : "query_database",
  };
}

/** Config token optionnelle : si fournie (OAuth), on l’utilise ; sinon token .env (serveur open-source). */
function getNotionMcpConfig(accessToken?: string | null): { url: string; token: string } | null {
  const url = getNotionMcpUrl();
  const mode = getNotionRuntimeMode();
  const token =
    accessToken?.trim() || (mode !== "oauth" ? getRawNotionEnvToken() : undefined);
  if (!token) return null;
  return { url, token };
}

/** True si le MCP Notion est utilisable (URL + token .env ou OAuth). */
export function isNotionMcpConfigured(): boolean {
  return hasNotionEnvToken() || hasNotionOAuthConfig();
}

/** True si un token .env est défini (serveur open-source). Sinon on utilise OAuth. */
export function hasNotionEnvToken(): boolean {
  return getNotionRuntimeMode() !== "oauth" && !!getRawNotionEnvToken();
}

export function hasNotionOAuthConfig(): boolean {
  if (getNotionRuntimeMode() === "server-token") {
    return false;
  }
  return (
    !!process.env.NOTION_OAUTH_REDIRECT_URI?.trim() ||
    !!process.env.NOTION_OAUTH_CLIENT_ID?.trim() ||
    getNotionMcpUrl().includes("mcp.notion.com")
  );
}

async function withNotionMcpClient<T>(
  fn: (client: Client) => Promise<T>,
  accessToken?: string | null
): Promise<T> {
  const config = getNotionMcpConfig(accessToken);
  if (!config) throw new Error("MCP Notion : connectez votre compte (OAuth) ou configurez NOTION_MCP_TOKEN pour le serveur open-source.");
  const transport = new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: { headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" } },
  });
  const client = new Client({ name: "asuncia-notion-mcp-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport as Parameters<Client["connect"]>[0]);
  try {
    return await fn(client);
  } finally {
    await transport.close();
  }
}

export async function listNotionMcpTools(accessToken?: string | null) {
  return withNotionMcpClient((client) => client.listTools(), accessToken);
}

/**
 * Appelle un outil Notion MCP.
 * Si accessToken est fourni (OAuth utilisateur), il est utilisé ; sinon token .env (serveur open-source).
 */
export async function callNotionMcpTool(
  name: string,
  args: Record<string, unknown> = {},
  accessToken?: string | null
) {
  return withNotionMcpClient((client) => client.callTool({ name, arguments: args }), accessToken);
}
