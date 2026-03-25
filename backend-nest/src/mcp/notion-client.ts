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

/** URL MCP hébergé par Notion (OAuth utilisateur uniquement, pas le secret d’intégration). */
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

export function getNotionRuntimeMode(): NotionRuntimeMode {
  const mode = process.env.NOTION_RUNTIME_MODE?.trim().toLowerCase();
  if (mode === "oauth" || mode === "server-token") {
    return mode;
  }
  return "auto";
}

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

export function isNotionMcpConfigured(): boolean {
  return hasNotionEnvToken() || hasNotionOAuthConfig();
}

function getNotionMcpConfig(accessToken?: string | null): { url: string; token: string } | null {
  const url = getNotionMcpUrl();
  const mode = getNotionRuntimeMode();
  const official = isOfficialNotionMcpUrl(url);
  const oauthUser = accessToken?.trim() ? normalizeBearerToken(accessToken) : undefined;

  // MCP officiel Notion : uniquement jeton OAuth (pas NOTION_API_KEY / secret d’intégration).
  if (official) {
    if (!oauthUser) return null;
    return { url, token: oauthUser };
  }

  if (oauthUser) return { url, token: oauthUser };
  if (mode === "oauth") return null;
  const envTok = getRawNotionEnvToken();
  if (!envTok) return null;
  return { url, token: normalizeBearerToken(envTok) };
}

async function withNotionMcpClient<T>(
  fn: (client: Client) => Promise<T>,
  accessToken?: string | null,
): Promise<T> {
  const config = getNotionMcpConfig(accessToken);
  if (!config)
    throw new Error(
      "MCP Notion : connectez votre compte (OAuth) ou configurez NOTION_MCP_TOKEN pour le serveur open-source.",
    );
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

export async function callNotionMcpTool(
  name: string,
  args: Record<string, unknown> = {},
  accessToken?: string | null,
) {
  return withNotionMcpClient((client) => client.callTool({ name, arguments: args }), accessToken);
}

export function getNotionMcpToolNames(): { search: string; queryDatabase: string } {
  return {
    search: "notion-search",
    queryDatabase: "query-database",
  };
}


