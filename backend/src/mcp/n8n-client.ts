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

/**
 * Le MCP n8n (instance) attend `inputs` avec un discriminateur `type` parmi
 * `webhook` | `form` | `chat`. Sans cela, l’appel échoue (ex. Zod invalid_union_discriminator).
 */
export function normalizeExecuteWorkflowInputs(inputs: unknown): Record<string, unknown> {
  const defaultWebhook = (): Record<string, unknown> => ({ type: "webhook", body: {} as Record<string, unknown> });

  if (inputs === null || inputs === undefined) {
    return defaultWebhook();
  }
  if (typeof inputs !== "object" || Array.isArray(inputs)) {
    return defaultWebhook();
  }
  const obj = inputs as Record<string, unknown>;
  const t = obj.type;

  if (t === "webhook") {
    const out = { ...obj };
    if (out.body === undefined) {
      out.body = {};
    }
    return out;
  }
  if (t === "chat") {
    const out = { ...obj };
    if (out.chatInput === undefined && typeof out.message === "string") {
      out.chatInput = out.message;
    }
    if (out.chatInput === undefined) {
      out.chatInput = "";
    }
    return out;
  }
  if (t === "form") {
    return { ...obj };
  }

  return { type: "webhook", body: { ...obj } };
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
