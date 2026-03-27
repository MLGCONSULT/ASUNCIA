import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

type AirtableRuntimeMode = "auto" | "oauth" | "server-token";
export type AirtableMcpRuntimeConfig = {
  url?: string | null;
  serverToken?: string | null;
  runtimeMode?: AirtableRuntimeMode;
};

function getRawAirtableOAuthConfig(): boolean {
  return !!process.env.AIRTABLE_OAUTH_CLIENT_ID?.trim();
}

function getRawAirtableServerToken(runtime?: AirtableMcpRuntimeConfig): string | undefined {
  return runtime?.serverToken?.trim() || undefined;
}

export function getAirtableRuntimeMode(runtime?: AirtableMcpRuntimeConfig): AirtableRuntimeMode {
  const mode = runtime?.runtimeMode;
  if (mode === "oauth" || mode === "server-token") {
    return mode;
  }
  return "auto";
}

function getAirtableMcpConfig(runtime?: AirtableMcpRuntimeConfig): { url: string; token?: string; mode: Exclude<AirtableRuntimeMode, "auto"> } | null {
  const url = runtime?.url?.trim();
  if (!url) return null;

  const mode = getAirtableRuntimeMode(runtime);
  const oauthConfigured = getRawAirtableOAuthConfig();
  const serverToken = getRawAirtableServerToken(runtime);

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

export function isAirtableMcpConfigured(runtime?: AirtableMcpRuntimeConfig): boolean {
  const config = getAirtableMcpConfig(runtime);
  if (!config) return false;
  return isAirtableOAuthConfigured(runtime) || hasAirtableServerToken(runtime);
}

export function isAirtableOAuthConfigured(runtime?: AirtableMcpRuntimeConfig): boolean {
  return getAirtableRuntimeMode(runtime) !== "server-token" && getRawAirtableOAuthConfig();
}

export function hasAirtableServerToken(runtime?: AirtableMcpRuntimeConfig): boolean {
  return getAirtableRuntimeMode(runtime) !== "oauth" && !!getRawAirtableServerToken(runtime);
}

export async function withAirtableMcpClient<T>(
  fn: (client: Client) => Promise<T>,
  accessToken?: string,
  runtime?: AirtableMcpRuntimeConfig
): Promise<T> {
  const config = getAirtableMcpConfig(runtime);
  if (!config) throw new Error("MCP Airtable non configuré pour l'utilisateur : renseignez URL + token server-token dans la configuration in-app.");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Utiliser le token utilisateur si fourni, sinon le token global
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

export async function listAirtableMcpTools(accessToken?: string, runtime?: AirtableMcpRuntimeConfig) {
  return withAirtableMcpClient((client) => client.listTools(), accessToken, runtime);
}

export async function callAirtableMcpTool(
  name: string,
  args: Record<string, unknown> = {},
  accessToken?: string,
  runtime?: AirtableMcpRuntimeConfig
) {
  return withAirtableMcpClient((client) => client.callTool({ name, arguments: args }), accessToken, runtime);
}
