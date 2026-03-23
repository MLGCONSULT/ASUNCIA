import { Body, Controller, HttpException, HttpStatus, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { withSupabaseMcpClient } from "../mcp/supabase-client";
import { isSupabaseMcpConfigured } from "../mcp/supabase-client";
import { mcpResultToText } from "../mcp/result";

type AuthRequest = Request & { user?: { id: string } };

type SqlFromPromptBody = {
  prompt: string;
};

function normalizeSql(sql: string): string {
  // Supprime les espaces inutiles et le point-virgule final éventuel.
  const withoutFences = sql.replace(/```[a-zA-Z]*\s*/g, "").replace(/```/g, "").trim();
  const trimmed = withoutFences.trim().replace(/;+\s*$/g, "");
  return trimmed;
}

function isReadOnlySql(sql: string): boolean {
  // On supprime les commentaires pour éviter des faux positifs.
  const s = normalizeSql(sql)
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
  if (!s) return false;

  const forbidden = /\b(insert|update|delete|alter|drop|truncate|create|grant|revoke|comment|merge|call)\b/i;
  if (forbidden.test(s)) return false;

  // Interdit plusieurs statements (point-virgule au milieu).
  if (s.includes(";")) return false;

  // Autorise uniquement les requêtes "lecture".
  return /^(select|with|show|explain|describe)\b/i.test(s);
}

function tryParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractJsonFromUntrustedEnvelope(text: string): unknown | null {
  // Exemple MCP:
  // {"result":"...<untrusted-data-uuid>\n[...json...]\n</untrusted-data-uuid>..."}
  const outer = tryParseJson(text) as { result?: unknown } | null;
  const resultText = typeof outer?.result === "string" ? outer.result : text;
  const match = resultText.match(/<untrusted-data-[^>]+>\s*([\s\S]*?)\s*<\/untrusted-data-[^>]+>/i);
  const inner = match?.[1]?.trim();
  if (!inner) return null;
  return tryParseJson(inner);
}

function parseMcpPayload(text: string): unknown {
  return tryParseJson(text) ?? extractJsonFromUntrustedEnvelope(text) ?? text;
}

function readMcpError(result: unknown): string | null {
  const isErr = Boolean((result as { isError?: unknown })?.isError);
  if (!isErr) return null;
  const raw = mcpResultToText(result);
  const parsed = parseMcpPayload(raw) as any;
  if (typeof parsed?.error?.message === "string") return parsed.error.message;
  if (typeof parsed?.error === "string") return parsed.error;
  if (typeof parsed?.message === "string") return parsed.message;
  if (typeof raw === "string" && raw.trim().length > 0) return raw;
  return "Erreur MCP inconnue";
}

function buildSchemaText(tables: { name: string; columns: { name: string; type: string }[] }[]): string {
  if (tables.length === 0) return "Aucune table trouvée dans le schéma public.";
  return tables
    .map((t) => {
      const cols =
        t.columns.length > 0
          ? t.columns.map((c) => `- ${c.name}: ${c.type}`).join("\n")
          : "- (aucune colonne détectée)";
      return `Table ${t.name}\n${cols}`;
    })
    .join("\n\n");
}

function normalizePrompt(prompt: string): string {
  return prompt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractLimit(prompt: string): number {
  const p = normalizePrompt(prompt);
  const top = p.match(/\btop\s+(\d+)\b/);
  if (top?.[1]) return Math.max(1, Math.min(Number(top[1]), 200));

  const firstN = p.match(/\b(\d+)\s+(premier|premiere|premieres|premiers|elements|enregistrements|lignes)\b/);
  if (firstN?.[1]) return Math.max(1, Math.min(Number(firstN[1]), 200));

  if (/\bpremier\b|\bpremiere\b/.test(p)) return 1;
  return 10;
}

function extractRequestedTable(prompt: string): string | null {
  const p = normalizePrompt(prompt);
  const m = p.match(/\btable\s+([a-z0-9_]+)/i);
  if (m?.[1]) return m[1];
  return null;
}

function resolveTableFromPrompt(
  prompt: string,
  tables: { name: string; columns: { name: string; type: string }[] }[],
): { table: string; matchedBy: "explicit" | "contains" } | null {
  const requested = extractRequestedTable(prompt);
  if (requested) {
    const exact = tables.find((t) => t.name.toLowerCase() === requested);
    if (exact) return { table: exact.name, matchedBy: "explicit" };
  }

  const p = normalizePrompt(prompt);
  const byContains = [...tables]
    .sort((a, b) => b.name.length - a.name.length)
    .find((t) => p.includes(t.name.toLowerCase()));
  if (byContains) return { table: byContains.name, matchedBy: "contains" };

  return null;
}

function buildDeterministicReadOnlySql(
  prompt: string,
  table: { name: string; columns: { name: string; type: string }[] },
): string {
  const limit = extractLimit(prompt);
  const p = normalizePrompt(prompt);
  const colNames = table.columns.map((c) => c.name.toLowerCase());

  const candidateDateCols = ["created_at", "date_creation", "createdat", "date", "updated_at", "date_mise_a_jour"];
  const orderCol = candidateDateCols.find((c) => colNames.includes(c));
  const wantsRecent = /\brecent|recents|recentes|dernier|derniers|nouv/.test(p);
  const wantsOldest = /\bancien|anciens|plus ancien|premier arrive/.test(p);

  const safeTable = `"${table.name.replace(/"/g, '""')}"`;
  let sql = `select * from ${safeTable}`;

  if (orderCol && (wantsRecent || wantsOldest)) {
    const safeOrder = `"${orderCol.replace(/"/g, '""')}"`;
    sql += wantsOldest ? ` order by ${safeOrder} asc` : ` order by ${safeOrder} desc`;
  }
  sql += ` limit ${limit}`;
  return sql;
}

async function getPublicSchema(limitTables: number): Promise<{ name: string; columns: { name: string; type: string }[] }[]> {
  return withSupabaseMcpClient(async (client) => {
    // Utilise l'outil MCP natif list_tables (plus fiable que information_schema selon les projets).
    const tablesRes = await client.callTool({
      name: "list_tables",
      arguments: { schemas: ["public"], verbose: true },
    });
    const tablesErr = readMcpError(tablesRes);
    if (tablesErr) {
      throw new Error(`MCP list_tables a échoué: ${tablesErr}`);
    }

    const tablesText = mcpResultToText(tablesRes);
    const payload = parseMcpPayload(tablesText) as any;
    const rawTables = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.tables)
        ? payload.tables
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.rows)
            ? payload.rows
            : [];

    const normalized: { name: string; columns: { name: string; type: string }[] }[] = [];
    for (const t of rawTables.slice(0, limitTables)) {
      const name =
        typeof t?.name === "string"
          ? t.name
          : typeof t?.table_name === "string"
            ? t.table_name
            : typeof t?.table === "string"
              ? t.table
              : null;
      if (!name) continue;

      const rawCols = Array.isArray(t?.columns) ? t.columns : [];
      const cols: { name: string; type: string }[] = [];
      for (const c of rawCols) {
        const colName =
          typeof c?.name === "string"
            ? c.name
            : typeof c?.column_name === "string"
              ? c.column_name
              : null;
        const colType =
          typeof c?.type === "string"
            ? c.type
            : typeof c?.data_type === "string"
              ? c.data_type
              : "unknown";
        if (colName) cols.push({ name: colName, type: colType });
      }

      normalized.push({ name, columns: cols });
    }

    return normalized;
  });
}

@Controller("supabase")
export class SqlFromPromptController {
  @Post("sql-from-prompt")
  async sqlFromPrompt(@Req() req: AuthRequest, @Body() body: SqlFromPromptBody) {
    try {
      if (!req.user) {
        throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
      }
      if (!isSupabaseMcpConfigured()) {
        throw new HttpException({ error: "MCP Supabase non configuré" }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      const prompt = String(body?.prompt ?? "").trim();
      if (!prompt) {
        throw new HttpException({ error: "prompt requis" }, HttpStatus.BAD_REQUEST);
      }

      // Introspection du schéma via MCP Supabase (read-only)
      const schemaTables = await getPublicSchema(25);
      if (schemaTables.length === 0) {
        throw new HttpException(
          {
            error:
              "Aucune table trouvée via MCP Supabase (schéma public vide ou inaccessible).",
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      const resolved = resolveTableFromPrompt(prompt, schemaTables);
      if (!resolved) {
        const sample = schemaTables.slice(0, 8).map((t) => t.name);
        throw new HttpException(
          {
            error:
              "Je ne trouve pas de table correspondante dans votre base. Mentionne explicitement le nom de la table (ex: table documents).",
            availableTablesSample: sample,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const table = schemaTables.find((t) => t.name === resolved.table)!;
      const sql = normalizeSql(buildDeterministicReadOnlySql(prompt, table));

      if (!isReadOnlySql(sql)) {
        throw new HttpException(
          {
            error: "La requête générée n'est pas considérée comme non destructive. Réessaie la demande.",
            generatedPreview: sql.slice(0, 180),
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return { sql, resolvedTable: table.name, mode: "mcp-deterministic" };
    } catch (err) {
      // On renvoie toujours une réponse { error } lisible côté front.
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }
}

