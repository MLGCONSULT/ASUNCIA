import { Body, Controller, HttpException, HttpStatus, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import OpenAI from "openai";
import { withSupabaseMcpClient } from "../mcp/supabase-client";
import { isSupabaseMcpConfigured } from "../mcp/supabase-client";
import { mcpResultToText } from "../mcp/result";

type AuthRequest = Request & { user?: { id: string } };

type SqlFromPromptBody = {
  prompt: string;
};

function normalizeSql(sql: string): string {
  // Supprime les espaces inutiles et le point-virgule final éventuel.
  const trimmed = sql.trim().replace(/;+\s*$/g, "");
  return trimmed;
}

function isReadOnlySql(sql: string): boolean {
  const s = normalizeSql(sql);
  if (!s) return false;

  const forbidden = /\b(insert|update|delete|alter|drop|truncate|create|grant|revoke|comment|merge|call)\b/i;
  if (forbidden.test(s)) return false;

  // Interdit plusieurs statements (point-virgule au milieu).
  if (s.includes(";")) return false;

  // Autorise uniquement les requêtes "lecture".
  return /^(select|with|show|explain|describe)\b/i.test(s);
}

function extractSqlFromModelOutput(raw: string): string {
  // On tente d'abord un JSON strict.
  try {
    const parsed = JSON.parse(raw);
    const sql = typeof parsed?.sql === "string" ? parsed.sql : undefined;
    if (sql) return String(sql);
  } catch {
    // ignore
  }

  // Sinon, on extrait la première occurrence commençant par SELECT/WITH.
  const match = raw.match(/(with|select)\b[\s\S]*/i);
  if (match?.[0]) return match[0].trim();

  return raw.trim();
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
      arguments: { sql: tablesSql },
    });

    const tablesText = mcpResultToText(tablesRes);
    let tableNames: string[] = [];
    try {
      const parsed = JSON.parse(tablesText);
      if (Array.isArray(parsed)) {
        tableNames = parsed
          .map((row: any) => (typeof row?.table_name === "string" ? row.table_name : undefined))
          .filter(Boolean);
      } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).rows)) {
        tableNames = (parsed as any).rows
          .map((row: any) => (typeof row?.table_name === "string" ? row.table_name : undefined))
          .filter(Boolean);
      }
    } catch {
      // si impossible à parser, on renvoie vide (le modèle devra travailler sans schéma complet)
      tableNames = [];
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
        arguments: { sql: colsSql },
      });
      const colsText = mcpResultToText(colsRes);
      const cols: { name: string; type: string }[] = [];
      try {
        const parsed = JSON.parse(colsText);
        if (Array.isArray(parsed)) {
          for (const row of parsed as any[]) {
            if (typeof row?.column_name === "string" && typeof row?.data_type === "string") {
              cols.push({ name: row.column_name, type: row.data_type });
            }
          }
        }
      } catch {
        // ignore : schéma partiel
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new HttpException({ error: "OPENAI_API_KEY manquant" }, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

    // Introspection légère du schéma via MCP Supabase (read-only)
    const schemaTables = await getPublicSchema(25);
    const schemaText = buildSchemaText(schemaTables);

    const system = `Tu génères une requête SQL POUR SUPABASE à partir d'une demande en français.
Contraintes:
- SORTIE: renvoie STRICTEMENT un JSON { "sql": "<requête>" } (pas de texte autour).
- La requête doit être non destructive (SELECT uniquement).
- La requête doit commencer par SELECT ou WITH.
- Interdis totalement insert/update/delete/alter/drop/truncate/create/grant/revoke.
- Si la demande demande "les 5 premiers"/"top 5"/"premiers": utilise LIMIT 5.
- Utilise uniquement des tables et colonnes présentes dans le schéma ci-dessous.
`;

    const user = `Demande: ${prompt}

Schéma public (tables/colonnes):
${schemaText}

Retourne la requête SQL demandée.`;

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_completion_tokens: 500,
      // Pas de tool ici : on s'appuie sur le schéma obtenu via MCP.
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const sqlCandidate = extractSqlFromModelOutput(raw);
    const sql = normalizeSql(sqlCandidate);

    if (!isReadOnlySql(sql)) {
      throw new HttpException(
        { error: "La requête générée n'est pas considérée comme non destructive. Réessaie la demande." },
        HttpStatus.BAD_REQUEST,
      );
    }

    return { sql };
  }
}

