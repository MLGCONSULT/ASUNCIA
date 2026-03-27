import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const OFFICIAL_NOTION_MCP = "https://mcp.notion.com/mcp";
type NotionRuntimeMode = "auto" | "oauth" | "server-token";
export type NotionMcpRuntimeConfig = {
  url?: string | null;
  runtimeMode?: NotionRuntimeMode;
  serverToken?: string | null;
};

function getNotionMcpUrl(runtime?: NotionMcpRuntimeConfig): string {
  return runtime?.url?.trim() || process.env.NOTION_MCP_URL?.trim() || OFFICIAL_NOTION_MCP;
}

function getRawNotionEnvToken(runtime?: NotionMcpRuntimeConfig): string | undefined {
  return runtime?.serverToken?.trim() || process.env.NOTION_MCP_TOKEN?.trim() || process.env.NOTION_API_KEY?.trim() || undefined;
}

function isOfficialNotionMcpUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "mcp.notion.com";
  } catch {
    return (url || "").includes("mcp.notion.com");
  }
}

function normalizeBearerToken(raw: string): string {
  let t = raw.trim();
  if (t.toLowerCase().startsWith("bearer ")) {
    t = t.slice(7).trim();
  }
  return t;
}

export function getNotionRuntimeMode(runtime?: NotionMcpRuntimeConfig): NotionRuntimeMode {
  const mode = runtime?.runtimeMode || process.env.NOTION_RUNTIME_MODE?.trim().toLowerCase();
  if (mode === "oauth" || mode === "server-token") {
    return mode;
  }
  return "auto";
}

/** Noms d'outils selon le serveur : MCP officiel utilise notion-search / query-data-source. */
export function getNotionMcpToolNames(runtime?: NotionMcpRuntimeConfig): { search: string; queryDatabase: string } {
  const url = (getNotionMcpUrl(runtime) || OFFICIAL_NOTION_MCP).toLowerCase();
  const isOfficial = url.includes("mcp.notion.com");
  return {
    search: isOfficial ? "notion-search" : "search",
    queryDatabase: isOfficial ? "query-data-source" : "query_database",
  };
}

/** Config : MCP officiel = OAuth uniquement ; self-hosted = token .env ou OAuth. */
function getNotionMcpConfig(accessToken?: string | null, runtime?: NotionMcpRuntimeConfig): { url: string; token: string } | null {
  const url = getNotionMcpUrl(runtime);
  const mode = getNotionRuntimeMode(runtime);
  const official = isOfficialNotionMcpUrl(url);
  const oauthUser = accessToken?.trim() ? normalizeBearerToken(accessToken) : undefined;

  if (official) {
    if (!oauthUser) return null;
    return { url, token: oauthUser };
  }

  if (oauthUser) return { url, token: oauthUser };
  if (mode === "oauth") return null;
  const envTok = getRawNotionEnvToken(runtime);
  if (!envTok) return null;
  return { url, token: normalizeBearerToken(envTok) };
}

/** True si le MCP Notion est utilisable (URL + token .env ou OAuth). */
export function isNotionMcpConfigured(runtime?: NotionMcpRuntimeConfig): boolean {
  return hasNotionEnvToken(runtime) || hasNotionOAuthConfig(runtime);
}

/** True si un token .env est défini (serveur open-source). Sinon on utilise OAuth. */
export function hasNotionEnvToken(runtime?: NotionMcpRuntimeConfig): boolean {
  return getNotionRuntimeMode(runtime) !== "oauth" && !!getRawNotionEnvToken(runtime);
}

export function hasNotionOAuthConfig(runtime?: NotionMcpRuntimeConfig): boolean {
  if (getNotionRuntimeMode(runtime) === "server-token") {
    return false;
  }
  return (
    !!process.env.NOTION_OAUTH_REDIRECT_URI?.trim() ||
    !!process.env.NOTION_OAUTH_CLIENT_ID?.trim() ||
    getNotionMcpUrl(runtime).includes("mcp.notion.com")
  );
}

async function withNotionMcpClient<T>(
  fn: (client: Client) => Promise<T>,
  accessToken?: string | null,
  runtime?: NotionMcpRuntimeConfig
): Promise<T> {
  const config = getNotionMcpConfig(accessToken, runtime);
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

export async function listNotionMcpTools(accessToken?: string | null, runtime?: NotionMcpRuntimeConfig) {
  return withNotionMcpClient((client) => client.listTools(), accessToken, runtime);
}

/**
 * Appelle un outil Notion MCP.
 * Si accessToken est fourni (OAuth utilisateur), il est utilisé ; sinon token .env (serveur open-source).
 */
export async function callNotionMcpTool(
  name: string,
  args: Record<string, unknown> = {},
  accessToken?: string | null,
  runtime?: NotionMcpRuntimeConfig
) {
  return withNotionMcpClient((client) => client.callTool({ name, arguments: args }), accessToken, runtime);
}
