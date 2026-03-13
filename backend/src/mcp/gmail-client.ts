import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

function getGmailMcpUrl(): string | null {
  return process.env.GMAIL_MCP_URL?.trim() || null;
}

export function isGmailMcpConfigured(): boolean {
  return getGmailMcpUrl() !== null;
}

export function hasGmailMcpUrl(): boolean {
  return isGmailMcpConfigured();
}

export async function withGmailMcpClient<T>(accessToken: string, fn: (client: Client) => Promise<T>): Promise<T> {
  const url = getGmailMcpUrl();
  if (!url) throw new Error("MCP Gmail non configuré : GMAIL_MCP_URL requis.");
  if (!accessToken) throw new Error("Token Gmail requis pour appeler le MCP Gmail.");
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } },
  });
  const client = new Client({ name: "asuncia-gmail-mcp-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport as Parameters<Client["connect"]>[0]);
  try {
    return await fn(client);
  } finally {
    await transport.close();
  }
}

export async function listGmailMcpTools(accessToken: string) {
  return withGmailMcpClient(accessToken, (client) => client.listTools());
}

export async function callGmailMcpTool(name: string, args: Record<string, unknown>, accessToken: string) {
  return withGmailMcpClient(accessToken, (client) => client.callTool({ name, arguments: args }));
}
