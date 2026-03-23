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
    // 1) Tables publiques
    const tablesSql = `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name
      limit ${limitTables};
    `;
    const tablesRes = await client.callTool({
      name: "execute_sql",
      arguments: { query: tablesSql },
    });

    const tablesText = mcpResultToText(tablesRes);
    const parsedTables = parseMcpPayload(tablesText);
    let tableNames: string[] = [];
    if (Array.isArray(parsedTables)) {
      tableNames = parsedTables
        .map((row: any) => (typeof row?.table_name === "string" ? row.table_name : undefined))
        .filter(Boolean);
    } else if (parsedTables && typeof parsedTables === "object" && Array.isArray((parsedTables as any).rows)) {
      tableNames = (parsedTables as any).rows
        .map((row: any) => (typeof row?.table_name === "string" ? row.table_name : undefined))
        .filter(Boolean);
    }

    const tables: { name: string; columns: { name: string; type: string }[] }[] = [];
    for (const name of tableNames) {
      const colsSql = `
        select column_name, data_type
        from information_schema.columns
        where table_schema = 'public'
          and table_name = '${name.replace(/'/g, "''")}'
        order by ordinal_position;
      `;
      const colsRes = await client.callTool({
        name: "execute_sql",
        arguments: { query: colsSql },
      });
      const colsText = mcpResultToText(colsRes);
      const parsedCols = parseMcpPayload(colsText);
      const cols: { name: string; type: string }[] = [];
      if (Array.isArray(parsedCols)) {
        for (const row of parsedCols as any[]) {
          if (typeof row?.column_name === "string" && typeof row?.data_type === "string") {
            cols.push({ name: row.column_name, type: row.data_type });
          }
        }
      }
      tables.push({ name, columns: cols });
    }

    return tables;
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
              "Impossible de lire le schéma de la base via MCP Supabase. Vérifie SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF.",
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

