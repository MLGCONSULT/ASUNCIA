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
 * Aligné sur le schéma officiel n8n (`execute-workflow.tool.ts`) :
 * - `webhook` → `webhookData: { method?, query?, body?, headers? }` (pas `body` à la racine).
 * - `form` → `formData: Record<string, unknown>`.
 * - `chat` → `chatInput: string`.
 * @see https://docs.n8n.io/advanced-ai/accessing-n8n-mcp-server/
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
    // Ancien format erroné : { type: "webhook", body: {} }
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

/**
 * URL de base de l’UI n8n (ex. https://n8n.example.com), dérivée de {@link N8N_MCP_URL}
 * ou de {@link N8N_BASE_URL} — sans variable d’environnement supplémentaire côté front.
 */
export function getN8nEditorBaseUrl(): string | null {
  const mcp = process.env.N8N_MCP_URL?.trim();
  if (mcp) {
    try {
      return new URL(mcp).origin;
    } catch {
      /* ignore */
    }
  }
  const base = process.env.N8N_BASE_URL?.trim();
  if (base) {
    try {
      return new URL(base).origin;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export async function listN8nMcpTools() {
  const config = getN8nMcpConfig();
  if (!config) throw new Error("MCP n8n non configuré : N8N_MCP_URL et N8N_MCP_ACCESS_TOKEN requis.");
  const transport = new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: { headers: { Authorization: "Bearer " + config.token, "Content-Type": "application/json" } },
  });
  const client = new Client({ name: "asuncia-n8n-mcp-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport as Parameters<Client["connect"]>[0]);
  try {
    return await client.listTools();
  } finally {
    await transport.close();
  }
}

export async function callN8nMcpTool(name: string, args: Record<string, unknown> = {}) {
  const config = getN8nMcpConfig();
  if (!config) throw new Error("MCP n8n non configuré : N8N_MCP_URL et N8N_MCP_ACCESS_TOKEN requis.");
  const transport = new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: { headers: { Authorization: "Bearer " + config.token, "Content-Type": "application/json" } },
  });
  const client = new Client({ name: "asuncia-n8n-mcp-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport as Parameters<Client["connect"]>[0]);
  try {
    return await client.callTool({ name, arguments: args });
  } finally {
    await transport.close();
  }
}

