import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

function getSupabaseMcpConfig(): { url: string; token: string } | null {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) return null;
  const projectRef =
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
  return { url: `https://mcp.supabase.com/mcp?project_ref=${projectRef}&read_only=true`, token };
}

export function isSupabaseMcpConfigured(): boolean {
  return getSupabaseMcpConfig() !== null;
}

export async function withSupabaseMcpClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const config = getSupabaseMcpConfig();
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

export async function listMcpTools() {
  return withSupabaseMcpClient((client) => client.listTools());
}

export async function callMcpTool(name: string, args: Record<string, unknown> = {}) {
  return withSupabaseMcpClient((client) => client.callTool({ name, arguments: args }));
}
