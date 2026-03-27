import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export type SupabaseMcpRuntimeConfig = {
  url?: string | null;
  token?: string | null;
  projectRef?: string | null;
};

function getSupabaseMcpConfig(runtime?: SupabaseMcpRuntimeConfig): { url: string; token: string } | null {
  const token = runtime?.token?.trim();
  if (!token) return null;
  const explicitUrl = runtime?.url?.trim();
  if (explicitUrl) return { url: explicitUrl, token };

  const projectRef = runtime?.projectRef?.trim();
  if (!projectRef) return null;
  // Accès MCP Supabase strictement en lecture (read_only=true) pour l'éditeur SQL.
  // Aucune requête d'écriture ne sera acceptée côté serveur MCP.
  return { url: `https://mcp.supabase.com/mcp?project_ref=${projectRef}&read_only=true`, token };
}

export function isSupabaseMcpConfigured(runtime?: SupabaseMcpRuntimeConfig): boolean {
  return getSupabaseMcpConfig(runtime) !== null;
}

export async function withSupabaseMcpClient<T>(
  fn: (client: Client) => Promise<T>,
  runtime?: SupabaseMcpRuntimeConfig
): Promise<T> {
  const config = getSupabaseMcpConfig(runtime);
  if (!config) throw new Error("MCP Supabase non configuré pour l'utilisateur : renseignez token + URL ou project_ref dans la configuration in-app.");
  const transport = new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: { headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" } },
  });
  const client = new Client({ name: "asuncia-mcp-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport as Parameters<Client["connect"]>[0]);
  try {
    return await fn(client);
  } finally {
    await transport.close();
  }
}

export async function listMcpTools(runtime?: SupabaseMcpRuntimeConfig) {
  return withSupabaseMcpClient((client) => client.listTools(), runtime);
}

export async function callMcpTool(
  name: string,
  args: Record<string, unknown> = {},
  runtime?: SupabaseMcpRuntimeConfig
) {
  return withSupabaseMcpClient((client) => client.callTool({ name, arguments: args }), runtime);
}
