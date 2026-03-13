import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

function getN8nMcpConfig(): { url: string; token: string } | null {
  let url = process.env.N8N_MCP_URL?.trim();
  if (!url && process.env.N8N_BASE_URL?.trim()) {
    try {
      const u = new URL(process.env.N8N_BASE_URL.trim());
      u.pathname = (u.pathname || "/").replace(/\/?$/, "") + "/mcp-server/http";
      url = u.toString();
    } catch {
      url = undefined;
    }
  }
  const token = process.env.N8N_MCP_ACCESS_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

export function isN8nMcpConfigured(): boolean {
  return getN8nMcpConfig() !== null;
}

export async function withN8nMcpClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const config = getN8nMcpConfig();
  if (!config) throw new Error("MCP n8n non configuré : N8N_MCP_URL et N8N_MCP_ACCESS_TOKEN requis.");
  const transport = new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: { headers: { Authorization: "Bearer " + config.token, "Content-Type": "application/json" } },
  });
  const client = new Client({ name: "asuncia-n8n-mcp-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport as Parameters<Client["connect"]>[0]);
  try {
    return await fn(client);
  } finally {
    await transport.close();
  }
}

export async function listN8nMcpTools() {
  return withN8nMcpClient((client) => client.listTools());
}

export async function callN8nMcpTool(name: string, args: Record<string, unknown> = {}) {
  return withN8nMcpClient((client) => client.callTool({ name, arguments: args }));
}
