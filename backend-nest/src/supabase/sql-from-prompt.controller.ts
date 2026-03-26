import { Body, Controller, Get, HttpException, HttpStatus, Post, Req } from "@nestjs/common";
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
  const m = p.match(/\btable\s+([a-z0-9_.]+)/i);
  if (m?.[1]) return m[1];
  return null;
}

function stripSchemaPrefix(tableName: string): string {
  const parts = tableName.split(".");
  return parts[parts.length - 1];
}

function quoteSqlIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function quoteTableSql(tableName: string): string {
  return tableName
    .split(".")
    .map((part) => quoteSqlIdentifier(part))
    .join(".");
}

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "");
}

function resolveColumnFromPrompt(prompt: string, table: { name: string; columns: { name: string; type: string }[] }): string | null {
  const p = normalizePrompt(prompt);
  const normalizedPrompt = normalizeForMatch(p);
  const cols = table.columns.map((c) => c.name);
  if (cols.length === 0) return null;

  // 1) priorité à la mention explicite "colonne xxx"
  const explicit = p.match(/\bcolonne\s+([a-z0-9_]+)/i)?.[1];
  if (explicit) {
    const exact = cols.find((c) => normalizeForMatch(c) === normalizeForMatch(explicit));
    if (exact) return exact;
  }

  // 2) sinon, match par inclusion du nom de colonne
  const byContains = cols.find((c) => {
    const n = normalizeForMatch(c);
    return n.length > 0 && normalizedPrompt.includes(n);
  });
  if (byContains) return byContains;

  return null;
}

function detectOrderDirection(prompt: string): "asc" | "desc" | null {
  const p = normalizePrompt(prompt);
  if (/\b(ordre alphabetique|ordre alphabétique|alphabetique|alphabétique|a-z)\b/.test(p)) return "asc";
  if (/\b(ordre alphabetique inverse|ordre alphabétique inverse|z-a)\b/.test(p)) return "desc";
  if (/\b(croissant|ascending|asc|du plus petit au plus grand)\b/.test(p)) return "asc";
  if (/\b(decroissant|descending|desc|du plus grand au plus petit)\b/.test(p)) return "desc";
  if (/\b(plus eleve|plus élevé|plus hauts|plus haut|highest|top)\b/.test(p)) return "desc";
  if (/\b(plus faible|plus bas|lowest)\b/.test(p)) return "asc";
  if (/\b(plus recent|plus recents|dernier|derniers|nouv|recent)\b/.test(p)) return "desc";
  if (/\b(plus ancien|plus anciens|ancien|anciens)\b/.test(p)) return "asc";
  return null;
}

function wantsOrdering(prompt: string): boolean {
  const p = normalizePrompt(prompt);
  return /\b(trie|trier|triez|ordre|ordonne|ordonner|class|sort|croissant|decroissant|alphabetique|alphabétique|a-z|z-a|plus eleve|plus élevé|plus bas|plus faible)\b/.test(p);
}

function isNumericColumnType(type: string): boolean {
  return /(int|numeric|decimal|real|double|float|serial)/i.test(type);
}

function isDateColumnType(type: string): boolean {
  return /(date|time)/i.test(type);
}

function resolveDateColumnFromPrompt(
  prompt: string,
  table: { name: string; columns: { name: string; type: string }[] },
): string | null {
  const requested = resolveColumnFromPrompt(prompt, table);
  if (requested) {
    const col = table.columns.find((c) => c.name === requested);
    if (col && isDateColumnType(col.type)) return col.name;
  }

  const normalized = table.columns.map((c) => ({ ...c, lower: c.name.toLowerCase() }));
  const preferred = ["created_at", "date_creation", "updated_at", "date_mise_a_jour", "createdat", "date"];
  for (const name of preferred) {
    const hit = normalized.find((c) => c.lower === name);
    if (hit) return hit.name;
  }

  const firstDate = normalized.find((c) => isDateColumnType(c.type));
  return firstDate?.name ?? null;
}

function buildDateRangeClauseFromPrompt(
  prompt: string,
  table: { name: string; columns: { name: string; type: string }[] },
): string | null {
  const p = normalizePrompt(prompt);
  const dateCol = resolveDateColumnFromPrompt(prompt, table);
  if (!dateCol) return null;
  const c = quoteSqlIdentifier(dateCol);

  if (/\baujourd\s*hui\b/.test(p)) return `${c}::date = current_date`;
  if (/\bhier\b/.test(p)) return `${c}::date = current_date - interval '1 day'`;
  if (/\b(7|sept)\s+(dernier|derniers)\s+jours\b/.test(p)) return `${c} >= current_date - interval '7 days'`;
  if (/\b30\s+(dernier|derniers)\s+jours\b/.test(p)) return `${c} >= current_date - interval '30 days'`;
  if (/\bcette semaine\b/.test(p)) return `${c} >= date_trunc('week', current_date)`;
  if (/\bce mois\b/.test(p)) return `${c} >= date_trunc('month', current_date)`;
  if (/\bcette annee\b|\bcette année\b/.test(p)) return `${c} >= date_trunc('year', current_date)`;

  return null;
}

type WhereBuildResult = {
  andClauses: string[];
  orGroups: string[];
};

function parseAndClausesFromText(
  text: string,
  table: { name: string; columns: { name: string; type: string }[] },
): string[] {
  const p = normalizePrompt(text);
  const byLower = new Map<string, { name: string; type: string }>();
  for (const c of table.columns) byLower.set(c.name.toLowerCase(), c);
  const clauses: string[] = [];

  // Cas 1: "où colonne = valeur" / "where colonne = valeur"
  const eq = p.match(/\b(?:ou|où|where)\s+([a-z0-9_]+)\s*=\s*["']?([^,"'\n]+)["']?/i);
  if (eq?.[1] && eq?.[2]) {
    const col = byLower.get(eq[1].toLowerCase());
    if (col) {
      const raw = eq[2].trim();
      if (/^(true|vrai)$/i.test(raw) && /bool/i.test(col.type)) {
        clauses.push(`${quoteSqlIdentifier(col.name)} = true`);
      } else if (/^(false|faux)$/i.test(raw) && /bool/i.test(col.type)) {
        clauses.push(`${quoteSqlIdentifier(col.name)} = false`);
      } else if (/^(null|vide|none)$/i.test(raw)) {
        clauses.push(`${quoteSqlIdentifier(col.name)} is null`);
      } else if (isNumericColumnType(col.type) && /^-?\d+(?:[.,]\d+)?$/.test(raw)) {
        clauses.push(`${quoteSqlIdentifier(col.name)} = ${raw.replace(",", ".")}`);
      } else {
        const val = raw.replace(/'/g, "''");
        clauses.push(`${quoteSqlIdentifier(col.name)} = '${val}'`);
      }
    }
  }

  // Cas 1b: "colonne != valeur" / "colonne <> valeur"
  const neq = p.match(/\b([a-z0-9_]+)\s*(?:!=|<>)\s*["']?([^,"'\n]+)["']?/i);
  if (neq?.[1] && neq?.[2]) {
    const col = byLower.get(neq[1].toLowerCase());
    if (col) {
      const raw = neq[2].trim();
      if (/^(null|vide|none)$/i.test(raw)) {
        clauses.push(`${quoteSqlIdentifier(col.name)} is not null`);
      } else if (isNumericColumnType(col.type) && /^-?\d+(?:[.,]\d+)?$/.test(raw)) {
        clauses.push(`${quoteSqlIdentifier(col.name)} <> ${raw.replace(",", ".")}`);
      } else {
        clauses.push(`${quoteSqlIdentifier(col.name)} <> '${raw.replace(/'/g, "''")}'`);
      }
    }
  }

  // Cas 2: "où colonne contient xxx"
  const contains = p.match(/\b(?:ou|où|where)\s+([a-z0-9_]+)\s+(?:contient|contains)\s+["']?([^,"'\n]+)["']?/i);
  if (contains?.[1] && contains?.[2]) {
    const col = byLower.get(contains[1].toLowerCase());
    if (col) {
      const val = contains[2].trim().replace(/'/g, "''");
      clauses.push(`${quoteSqlIdentifier(col.name)} ilike '%${val}%'`);
    }
  }

  // Cas 2b: "colonne commence par ..." / "finit par ..."
  const starts = p.match(/\b([a-z0-9_]+)\s+(?:commence par|starts with)\s+["']?([^,"'\n]+)["']?/i);
  if (starts?.[1] && starts?.[2]) {
    const col = byLower.get(starts[1].toLowerCase());
    if (col) clauses.push(`${quoteSqlIdentifier(col.name)} ilike '${starts[2].trim().replace(/'/g, "''")}%'`);
  }
  const ends = p.match(/\b([a-z0-9_]+)\s+(?:finit par|ends with)\s+["']?([^,"'\n]+)["']?/i);
  if (ends?.[1] && ends?.[2]) {
    const col = byLower.get(ends[1].toLowerCase());
    if (col) clauses.push(`${quoteSqlIdentifier(col.name)} ilike '%${ends[2].trim().replace(/'/g, "''")}'`);
  }

  // Cas 3: comparateurs numériques explicites (>, <, >=, <=)
  const cmp = p.match(/\b(?:ou|où|where)\s+([a-z0-9_]+)\s*(<=|>=|<|>)\s*(-?\d+(?:[.,]\d+)?)/i);
  if (cmp?.[1] && cmp?.[2] && cmp?.[3]) {
    const col = byLower.get(cmp[1].toLowerCase());
    if (col && isNumericColumnType(col.type)) {
      const n = cmp[3].replace(",", ".");
      clauses.push(`${quoteSqlIdentifier(col.name)} ${cmp[2]} ${n}`);
    }
  }

  // Cas 3b: "entre X et Y" sur une colonne numérique ou date.
  const between = p.match(/\b([a-z0-9_]+)\s+entre\s+(-?\d+(?:[.,]\d+)?)\s+et\s+(-?\d+(?:[.,]\d+)?)/i);
  if (between?.[1] && between?.[2] && between?.[3]) {
    const col = byLower.get(between[1].toLowerCase());
    if (col && isNumericColumnType(col.type)) {
      const min = between[2].replace(",", ".");
      const max = between[3].replace(",", ".");
      clauses.push(`${quoteSqlIdentifier(col.name)} between ${min} and ${max}`);
    }
  }

  // Cas 3c: comparateurs exprimés naturellement, sans "où"
  // ex: "montant supérieur à 200", "age inferieur a 18", "prix egal a 10"
  const naturalCmpRegex =
    /\b([a-z0-9_]+)\s+(superieur a|supérieur à|inferieur a|inférieur à|egal a|égal à|plus grand que|plus petit que)\s+(-?\d+(?:[.,]\d+)?)/gi;
  for (const m of p.matchAll(naturalCmpRegex)) {
    const col = byLower.get(String(m[1]).toLowerCase());
    if (!col || !isNumericColumnType(col.type)) continue;
    const phrase = String(m[2]);
    const n = String(m[3]).replace(",", ".");
    let op = "=";
    if (/superieur|supérieur|plus grand/.test(phrase)) op = ">";
    if (/inferieur|inférieur|plus petit/.test(phrase)) op = "<";
    if (/egal|égal/.test(phrase)) op = "=";
    clauses.push(`${quoteSqlIdentifier(col.name)} ${op} ${n}`);
  }

  // Cas 4: formulations naturelles sur le numérique.
  const ge = p.match(/\b([a-z0-9_]+)\s+(?:au moins|minimum|min)\s+(-?\d+(?:[.,]\d+)?)/i);
  if (ge?.[1] && ge?.[2]) {
    const col = byLower.get(ge[1].toLowerCase());
    if (col && isNumericColumnType(col.type)) clauses.push(`${quoteSqlIdentifier(col.name)} >= ${ge[2].replace(",", ".")}`);
  }
  const le = p.match(/\b([a-z0-9_]+)\s+(?:au plus|maximum|max)\s+(-?\d+(?:[.,]\d+)?)/i);
  if (le?.[1] && le?.[2]) {
    const col = byLower.get(le[1].toLowerCase());
    if (col && isNumericColumnType(col.type)) clauses.push(`${quoteSqlIdentifier(col.name)} <= ${le[2].replace(",", ".")}`);
  }

  // Cas 4b: null / non null (est vide / n'est pas vide)
  const isNull = p.match(/\b([a-z0-9_]+)\s+(?:est\s+)?(?:vide|null)\b/i);
  if (isNull?.[1]) {
    const col = byLower.get(isNull[1].toLowerCase());
    if (col) clauses.push(`${quoteSqlIdentifier(col.name)} is null`);
  }
  const isNotNull = p.match(/\b([a-z0-9_]+)\s+(?:n\s*est\s*pas|!=)\s*(?:vide|null)\b/i);
  if (isNotNull?.[1]) {
    const col = byLower.get(isNotNull[1].toLowerCase());
    if (col) clauses.push(`${quoteSqlIdentifier(col.name)} is not null`);
  }

  // Cas 4c: booléens exprimés naturellement.
  const boolTrue = p.match(/\b([a-z0-9_]+)\s+(?:actif|active|true|vrai)\b/i);
  if (boolTrue?.[1]) {
    const col = byLower.get(boolTrue[1].toLowerCase());
    if (col && /bool/i.test(col.type)) clauses.push(`${quoteSqlIdentifier(col.name)} = true`);
  }
  const boolFalse = p.match(/\b([a-z0-9_]+)\s+(?:inactif|inactive|false|faux)\b/i);
  if (boolFalse?.[1]) {
    const col = byLower.get(boolFalse[1].toLowerCase());
    if (col && /bool/i.test(col.type)) clauses.push(`${quoteSqlIdentifier(col.name)} = false`);
  }

  // Cas 4d: "colonne in a,b,c" ou "colonne parmi a,b,c"
  const inList = p.match(/\b([a-z0-9_]+)\s+(?:in|parmi)\s+([a-z0-9_\-\s,]+)/i);
  if (inList?.[1] && inList?.[2]) {
    const col = byLower.get(inList[1].toLowerCase());
    if (col) {
      const vals = inList[2]
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 20);
      if (vals.length > 0) {
        if (isNumericColumnType(col.type) && vals.every((v) => /^-?\d+(?:[.,]\d+)?$/.test(v))) {
          clauses.push(`${quoteSqlIdentifier(col.name)} in (${vals.map((v) => v.replace(",", ".")).join(", ")})`);
        } else {
          clauses.push(
            `${quoteSqlIdentifier(col.name)} in (${vals.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ")})`,
          );
        }
      }
    }
  }

  // Cas 5: période temporelle fréquente (aujourd'hui, ce mois, etc.).
  const dateClause = buildDateRangeClauseFromPrompt(text, table);
  if (dateClause) clauses.push(dateClause);

  return Array.from(new Set(clauses));
}

function buildWhereClausesFromPrompt(
  prompt: string,
  table: { name: string; columns: { name: string; type: string }[] },
): WhereBuildResult {
  const p = normalizePrompt(prompt);
  const andClauses: string[] = [];
  const orGroups: string[] = [];

  // Priorité à la structure "ET" au niveau global.
  const andSegments = p
    .split(/\bet\b/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const segmentsToParse = andSegments.length > 1 ? andSegments : [p];

  for (const seg of segmentsToParse) {
    if (/\bou\b/.test(seg)) {
      const orAlternatives = seg
        .split(/\bou\b/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((alt) => {
          const clauses = parseAndClausesFromText(alt, table);
          if (clauses.length === 0) return null;
          if (clauses.length === 1) return clauses[0];
          return `(${clauses.join(" and ")})`;
        })
        .filter((v): v is string => Boolean(v));

      if (orAlternatives.length > 1) {
        orGroups.push(`(${orAlternatives.join(" or ")})`);
        continue;
      }
      if (orAlternatives.length === 1) {
        andClauses.push(orAlternatives[0]);
        continue;
      }
    }

    andClauses.push(...parseAndClausesFromText(seg, table));
  }

  return {
    andClauses: Array.from(new Set(andClauses)),
    orGroups: Array.from(new Set(orGroups)),
  };
}

function composeWhereClause(whereBuild: WhereBuildResult): string | null {
  const parts = [
    ...whereBuild.andClauses,
    ...whereBuild.orGroups,
  ].filter((x) => x.trim().length > 0);
  if (parts.length === 0) return null;
  return parts.join(" and ");
}

function buildSelectColumnsFromPrompt(
  prompt: string,
  table: { name: string; columns: { name: string; type: string }[] },
): string[] | null {
  const p = normalizePrompt(prompt);
  const map = new Map<string, string>();
  for (const c of table.columns) map.set(c.name.toLowerCase(), c.name);

  // "affiche nom, statut, date_creation"
  const explicit = p.match(/\b(?:affiche|montre|selectionne|sélectionne|select)\s+([a-z0-9_,\s]+)/i)?.[1];
  if (!explicit) return null;
  const rawParts = explicit
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (rawParts.length === 0) return null;
  const selected = rawParts
    .map((part) => map.get(part.toLowerCase()) ?? null)
    .filter((v): v is string => Boolean(v));
  if (selected.length === 0) return null;
  return Array.from(new Set(selected));
}

function wantsDistinct(prompt: string): boolean {
  const p = normalizePrompt(prompt);
  return /\b(distinct|unique|uniques|sans doublons)\b/.test(p);
}

function resolveGroupByColumn(prompt: string, table: { name: string; columns: { name: string; type: string }[] }): string | null {
  const p = normalizePrompt(prompt);
  if (!/\b(combien|nombre|count|somme|moyenne|avg|minimum|maximum|min|max)\b/.test(p)) return null;
  const match = p.match(
    /\b(?:combien|nombre|count|somme|sum|moyenne|avg|minimum|maximum|min|max)(?:\s+de\s+[a-z0-9_]+)?\s+par\s+([a-z0-9_]+)/i,
  );
  if (!match?.[1]) return null;
  const wanted = match[1].toLowerCase();
  const col = table.columns.find((c) => c.name.toLowerCase() === wanted);
  return col?.name ?? null;
}

function resolveMetricColumn(prompt: string, table: { name: string; columns: { name: string; type: string }[] }): string | null {
  const p = normalizePrompt(prompt);
  const byLower = new Map<string, { name: string; type: string }>();
  for (const c of table.columns) byLower.set(c.name.toLowerCase(), c);
  const m = p.match(/\b(?:somme|sum|moyenne|avg|min|max|minimum|maximum)\s+(?:de\s+)?([a-z0-9_]+)/i);
  if (!m?.[1]) return null;
  const c = byLower.get(m[1].toLowerCase());
  if (!c || !isNumericColumnType(c.type)) return null;
  return c.name;
}

function resolveAggregate(prompt: string): "count" | "sum" | "avg" | "min" | "max" | null {
  const p = normalizePrompt(prompt);
  if (/\b(somme|sum)\b/.test(p)) return "sum";
  if (/\b(moyenne|avg)\b/.test(p)) return "avg";
  if (/\b(minimum|min)\b/.test(p)) return "min";
  if (/\b(maximum|max)\b/.test(p)) return "max";
  if (/\b(combien|nombre|count)\b/.test(p)) return "count";
  return null;
}

function wantsFiltering(prompt: string): boolean {
  const p = normalizePrompt(prompt);
  return /\b(ou|où|where|contient|contains|entre|au moins|au plus|minimum|maximum|min|max|in|parmi|vide|null|actif|inactif|superieur|supérieur|inferieur|inférieur|egal|égal|aujourd|hier|semaine|mois|annee|année)\b/.test(
    p,
  );
}

function wantsColumnSelection(prompt: string): boolean {
  const p = normalizePrompt(prompt);
  return /\b(affiche|montre|selectionne|sélectionne|colonnes?)\b/.test(p);
}

function resolveTableFromPrompt(
  prompt: string,
  tables: { name: string; columns: { name: string; type: string }[] }[],
): { table: string; matchedBy: "explicit" | "contains" } | null {
  const requestedRaw = extractRequestedTable(prompt);
  const requested = requestedRaw ? stripSchemaPrefix(requestedRaw.toLowerCase()) : null;
  if (requested) {
    const exact = tables.find((t) => {
      const full = t.name.toLowerCase();
      const short = stripSchemaPrefix(full);
      return full === requested || short === requested;
    });
    if (exact) return { table: exact.name, matchedBy: "explicit" };
  }

  const p = normalizePrompt(prompt);
  const byContains = [...tables]
    .sort((a, b) => b.name.length - a.name.length)
    .find((t) => {
      const full = t.name.toLowerCase();
      const short = stripSchemaPrefix(full);
      return p.includes(full) || p.includes(short);
    });
  if (byContains) return { table: byContains.name, matchedBy: "contains" };

  return null;
}

function buildDeterministicReadOnlySql(
  prompt: string,
  table: { name: string; columns: { name: string; type: string }[] },
): { sql: string; explanation: string; unmetExpectations: string[] } {
  const limit = extractLimit(prompt);
  const p = normalizePrompt(prompt);
  const colNames = table.columns.map((c) => c.name.toLowerCase());

  const candidateDateCols = ["created_at", "date_creation", "createdat", "date", "updated_at", "date_mise_a_jour"];
  const requestedOrderCol = resolveColumnFromPrompt(prompt, table);
  const fallbackDateCol = candidateDateCols.find((c) => colNames.includes(c)) ?? null;
  const direction = detectOrderDirection(prompt) ?? (requestedOrderCol && wantsOrdering(prompt) ? "asc" : null);
  const orderCol = requestedOrderCol ?? (direction ? fallbackDateCol : null);
  const whereBuild = buildWhereClausesFromPrompt(prompt, table);
  const requestedColumns = buildSelectColumnsFromPrompt(prompt, table);
  const groupByCol = resolveGroupByColumn(prompt, table);
  const aggregate = resolveAggregate(prompt);
  const metricCol = resolveMetricColumn(prompt, table);
  const distinct = wantsDistinct(prompt);
  const selectCols =
    requestedColumns && requestedColumns.length > 0
      ? requestedColumns.map((c) => quoteSqlIdentifier(c)).join(", ")
      : "*";

  const safeTable = quoteTableSql(table.name);
  let sql: string;

  if (groupByCol && aggregate) {
    const groupId = quoteSqlIdentifier(groupByCol);
    const metricExpr =
      aggregate === "count"
        ? "count(*) as total"
        : metricCol
          ? `${aggregate}(${quoteSqlIdentifier(metricCol)}) as total`
          : "count(*) as total";
    sql = `select ${groupId}, ${metricExpr} from ${safeTable}`;
    const whereSql = composeWhereClause(whereBuild);
    if (whereSql) sql += ` where ${whereSql}`;
    sql += ` group by ${groupId}`;

    if (orderCol && direction) {
      sql += ` order by ${quoteSqlIdentifier(orderCol)} ${direction}`;
    } else {
      sql += " order by total desc";
    }
  } else if (aggregate) {
    // Ex: "combien au total", "somme montant", "moyenne prix"
    const metricExpr =
      aggregate === "count"
        ? "count(*) as total"
        : metricCol
          ? `${aggregate}(${quoteSqlIdentifier(metricCol)}) as total`
          : "count(*) as total";
    sql = `select ${metricExpr} from ${safeTable}`;
    const whereSql = composeWhereClause(whereBuild);
    if (whereSql) sql += ` where ${whereSql}`;
  } else {
    const distinctPrefix = distinct ? "distinct " : "";
    sql = `select ${distinctPrefix}${selectCols} from ${safeTable}`;
    const whereSql = composeWhereClause(whereBuild);
    if (whereSql) sql += ` where ${whereSql}`;
    if (orderCol && direction) {
      sql += ` order by ${quoteSqlIdentifier(orderCol)} ${direction}`;
    }
  }
  sql += ` limit ${limit}`;

  const explanations: string[] = [];
  const unmetExpectations: string[] = [];
  explanations.push(`Table cible: ${table.name}.`);
  if (whereBuild.andClauses.length > 0 || whereBuild.orGroups.length > 0) {
    explanations.push("J’ai appliqué les filtres demandés.");
  }
  if (groupByCol && aggregate) {
    explanations.push(`J’ai regroupé les résultats par ${groupByCol} avec une agrégation ${aggregate.toUpperCase()}.`);
  }
  if (orderCol && direction) {
    explanations.push(`Tri sur ${orderCol} (${direction.toUpperCase()}).`);
  }
  explanations.push(`Limite: ${limit} ligne(s).`);

  if (wantsOrdering(prompt) && !(orderCol && direction)) {
    unmetExpectations.push("Le tri demandé n’a pas pu être déterminé.");
  }
  if (wantsFiltering(prompt) && whereBuild.andClauses.length === 0 && whereBuild.orGroups.length === 0) {
    unmetExpectations.push("Les filtres demandés n’ont pas pu être interprétés.");
  }
  if (wantsColumnSelection(prompt) && (!requestedColumns || requestedColumns.length === 0)) {
    unmetExpectations.push("Les colonnes à afficher n’ont pas été reconnues.");
  }
  if (/\b(combien|nombre|count|somme|sum|moyenne|avg|minimum|maximum|min|max)\b/.test(normalizePrompt(prompt)) && !aggregate) {
    unmetExpectations.push("Le calcul demandé (count/somme/moyenne/min/max) n’a pas pu être interprété.");
  }

  return { sql, explanation: explanations.join(" "), unmetExpectations };
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
  /** Liste les tables du schéma public (MCP list_tables), pour l’UI. */
  @Get("tables")
  async listTables(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isSupabaseMcpConfigured()) {
      throw new HttpException({ error: "MCP Supabase non configuré" }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const tables = await getPublicSchema(50);
      return { tables };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

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
      const generated = buildDeterministicReadOnlySql(prompt, table);
      const sql = normalizeSql(generated.sql);

      if (!isReadOnlySql(sql)) {
        throw new HttpException(
          {
            error: "La requête générée n'est pas considérée comme non destructive. Réessaie la demande.",
            generatedPreview: sql.slice(0, 180),
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const explanation =
        generated.unmetExpectations.length > 0
          ? `${generated.explanation} Note: certains détails ont été interprétés automatiquement (${generated.unmetExpectations.join(" ")}).`
          : generated.explanation;

      return { sql, resolvedTable: table.name, mode: "mcp-deterministic", explanation };
    } catch (err) {
      // On renvoie toujours une réponse { error } lisible côté front.
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }
}

