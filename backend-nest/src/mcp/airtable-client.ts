import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

type AirtableRuntimeMode = "auto" | "oauth" | "server-token";

function getRawAirtableOAuthConfig(): boolean {
  return !!process.env.AIRTABLE_OAUTH_CLIENT_ID?.trim();
}

function getRawAirtableServerToken(): string | undefined {
  return process.env.AIRTABLE_MCP_TOKEN?.trim() || process.env.AIRTABLE_TOKEN?.trim() || undefined;
}

export function getAirtableRuntimeMode(): AirtableRuntimeMode {
  const mode = process.env.AIRTABLE_RUNTIME_MODE?.trim().toLowerCase();
  if (mode === "oauth" || mode === "server-token") {
    return mode;
  }
  return "auto";
}

function getAirtableMcpConfig(): { url: string; token?: string; mode: Exclude<AirtableRuntimeMode, "auto"> } | null {
  const url = process.env.AIRTABLE_MCP_URL?.trim();
  if (!url) return null;

  const mode = getAirtableRuntimeMode();
  const oauthConfigured = getRawAirtableOAuthConfig();
  const serverToken = getRawAirtableServerToken();

  if (mode === "oauth") {
    return oauthConfigured ? { url, mode } : null;
  }
  if (mode === "server-token") {
    return serverToken ? { url, token: serverToken, mode } : null;
  }
  if (oauthConfigured) {
    return { url, mode: "oauth" };
  }
  return serverToken ? { url, token: serverToken, mode: "server-token" } : null;
}

export function isAirtableMcpConfigured(): boolean {
  const config = getAirtableMcpConfig();
  if (!config) return false;
  return isAirtableOAuthConfigured() || hasAirtableServerToken();
}

export function isAirtableOAuthConfigured(): boolean {
  return getAirtableRuntimeMode() !== "server-token" && getRawAirtableOAuthConfig();
}

export function hasAirtableServerToken(): boolean {
  return getAirtableRuntimeMode() !== "oauth" && !!getRawAirtableServerToken();
}

export async function withAirtableMcpClient<T>(
  fn: (client: Client) => Promise<T>,
  accessToken?: string,
): Promise<T> {
  const config = getAirtableMcpConfig();
  if (!config) throw new Error("MCP Airtable non configuré : AIRTABLE_MCP_URL requis.");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = accessToken || config.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  const transport = new StreamableHTTPClientTransport(new URL(config.url), { requestInit: { headers } });
  const client = new Client({ name: "asuncia-airtable-mcp-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport as Parameters<Client["connect"]>[0]);
  try {
    return await fn(client);
  } finally {
    await transport.close();
  }
}

export async function listAirtableMcpTools(accessToken?: string) {
  return withAirtableMcpClient((client) => client.listTools(), accessToken);
}

export async function callAirtableMcpTool(
  name: string,
  args: Record<string, unknown> = {},
  accessToken?: string,
) {
  return withAirtableMcpClient((client) => client.callTool({ name, arguments: args }), accessToken);
}


