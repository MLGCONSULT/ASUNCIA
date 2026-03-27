import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export type N8nMcpRuntimeConfig = {
  url?: string | null;
  token?: string | null;
};

function getN8nMcpConfig(runtime?: N8nMcpRuntimeConfig): { url: string; token: string } | null {
  let url = runtime?.url?.trim() || process.env.N8N_MCP_URL?.trim();
  if (!url && process.env.N8N_BASE_URL?.trim()) {
    try {
      const u = new URL(process.env.N8N_BASE_URL.trim());
      u.pathname = (u.pathname || "/").replace(/\/?$/, "") + "/mcp-server/http";
      url = u.toString();
    } catch {
      url = undefined;
    }
  }
  const token = runtime?.token?.trim() || process.env.N8N_MCP_ACCESS_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

export function isN8nMcpConfigured(runtime?: N8nMcpRuntimeConfig): boolean {
  return getN8nMcpConfig(runtime) !== null;
}

/**
 * Aligné sur le schéma officiel n8n : webhook → `webhookData`, form → `formData`, chat → `chatInput`.
 */
export function normalizeExecuteWorkflowInputs(inputs: unknown): Record<string, unknown> {
  const defaultWebhook = (): Record<string, unknown> => ({
    type: "webhook",
    webhookData: { method: "POST", body: {} as Record<string, unknown> },
  });

  if (inputs === null || inputs === undefined) {
    return defaultWebhook();
  }
  if (typeof inputs !== "object" || Array.isArray(inputs)) {
    return defaultWebhook();
  }
  const obj = inputs as Record<string, unknown>;
  const t = obj.type;

  if (t === "webhook") {
    const out = { ...obj } as Record<string, unknown>;
    if (out.webhookData === undefined && out.body !== undefined) {
      const rawBody = out.body;
      delete out.body;
      out.webhookData =
        typeof rawBody === "object" && rawBody !== null && !Array.isArray(rawBody)
          ? { method: "POST", body: rawBody as Record<string, unknown> }
          : { method: "POST", body: {} };
    }
    if (out.webhookData === undefined) {
      out.webhookData = { method: "POST", body: {} };
    } else if (typeof out.webhookData === "object" && out.webhookData !== null && !Array.isArray(out.webhookData)) {
      const wd = out.webhookData as Record<string, unknown>;
      out.webhookData = {
        ...(typeof wd.method === "string" ? { method: wd.method } : { method: "POST" }),
        ...(typeof wd.query === "object" && wd.query !== null && !Array.isArray(wd.query)
          ? { query: wd.query as Record<string, string> }
          : {}),
        ...(typeof wd.body === "object" && wd.body !== null && !Array.isArray(wd.body)
          ? { body: wd.body as Record<string, unknown> }
          : { body: {} }),
        ...(typeof wd.headers === "object" && wd.headers !== null && !Array.isArray(wd.headers)
          ? { headers: wd.headers as Record<string, string> }
          : {}),
      };
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
    const out = { ...obj };
    if (out.formData === undefined || typeof out.formData !== "object" || out.formData === null) {
      out.formData = {};
    }
    return out;
  }

  return {
    type: "webhook",
    webhookData: { method: "POST", body: { ...obj } },
  };
}

export async function withN8nMcpClient<T>(
  fn: (client: Client) => Promise<T>,
  runtime?: N8nMcpRuntimeConfig
): Promise<T> {
  const config = getN8nMcpConfig(runtime);
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

export async function listN8nMcpTools(runtime?: N8nMcpRuntimeConfig) {
  return withN8nMcpClient((client) => client.listTools(), runtime);
}

export async function callN8nMcpTool(
  name: string,
  args: Record<string, unknown> = {},
  runtime?: N8nMcpRuntimeConfig
) {
  return withN8nMcpClient((client) => client.callTool({ name, arguments: args }), runtime);
}
