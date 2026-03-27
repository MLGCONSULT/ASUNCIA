import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export type SupabaseMcpRuntimeConfig = {
  url?: string | null;
  token?: string | null;
  projectRef?: string | null;
};

function getSupabaseMcpConfig(runtime?: SupabaseMcpRuntimeConfig): { url: string; token: string } | null {
  const token = runtime?.token?.trim() || process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) return null;
  const explicitUrl = runtime?.url?.trim();
  if (explicitUrl) return { url: explicitUrl, token };

  const projectRef = runtime?.projectRef?.trim() ||
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    (() => {
      const u = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
      if (!u) return undefined;
      try {
        const match = new URL(u).hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
        return match ? match[1] : undefined;
      } catch {
        return undefined;
      }
    })();
  if (!projectRef) return null;
  // Accès MCP Supabase strictement en lecture (read_only=true) pour l'éditeur SQL.
  // Aucune requête d'écriture ne sera acceptée côté serveur MCP.
  return { url: `https://mcp.supabase.com/mcp?project_ref=${projectRef}&read_only=true`, token };
}

export function isSupabaseMcpConfigured(): boolean {
  return getSupabaseMcpConfig() !== null;
}

export async function withSupabaseMcpClient<T>(
  fn: (client: Client) => Promise<T>,
  runtime?: SupabaseMcpRuntimeConfig
): Promise<T> {
  const config = getSupabaseMcpConfig(runtime);
  if (!config) throw new Error("MCP Supabase non configuré : SUPABASE_ACCESS_TOKEN et NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_PROJECT_REF) requis.");
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
