"use client";

import { useCallback, useEffect, useState } from "react";
import PageMotion from "@/components/PageMotion";
import { fetchBackend } from "@/lib/api";

type SchemaTable = { name: string; columns: { name: string; type: string }[] };

function parseJsonSafely(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractMcpText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const textPart = content.find(
      (p: any) => p?.type === "text" && typeof p?.text === "string",
    ) as { text?: string } | undefined;
    if (typeof textPart?.text === "string") return textPart.text;
    return JSON.stringify(content);
  }
  if (content && typeof content === "object") return JSON.stringify(content);
  return String(content ?? "");
}

function extractMcpErrorMessage(content: unknown): string {
  const raw = extractMcpText(content);
  const parsed = parseJsonSafely(raw) as any;
  if (typeof parsed?.error?.message === "string") return parsed.error.message;
  if (typeof parsed?.error === "string") return parsed.error;

  const resultText = typeof parsed?.result === "string" ? parsed.result : raw;
  const match = resultText.match(
    /<untrusted-data-[^>]+>\s*([\s\S]*?)\s*<\/untrusted-data-[^>]+>/i,
  );
  const inner = match?.[1]?.trim();
  if (inner) {
    const innerParsed = parseJsonSafely(inner) as any;
    if (typeof innerParsed?.error?.message === "string") return innerParsed.error.message;
    if (typeof innerParsed?.error === "string") return innerParsed.error;
  }

  return raw;
}

function parseMcpResultPayload(content: unknown): unknown {
  const raw = extractMcpText(content);
  const parsed = parseJsonSafely(raw) as any;
  const resultText = typeof parsed?.result === "string" ? parsed.result : raw;
  const match = resultText.match(
    /<untrusted-data-[^>]+>\s*([\s\S]*?)\s*<\/untrusted-data-[^>]+>/i,
  );
  const inner = match?.[1]?.trim();
  if (!inner) return parsed ?? raw;

  const cleaned = inner
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const innerParsed = parseJsonSafely(cleaned);
  if (innerParsed != null) return innerParsed;

  // Fallback robuste: récupère la plus grande portion JSON tableau/objet.
  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart >= 0 && arrEnd > arrStart) {
    const candidate = cleaned.slice(arrStart, arrEnd + 1);
    const parsedArr = parseJsonSafely(candidate);
    if (parsedArr != null) return parsedArr;
  }
  const objStart = cleaned.indexOf("{");
  const objEnd = cleaned.lastIndexOf("}");
  if (objStart >= 0 && objEnd > objStart) {
    const candidate = cleaned.slice(objStart, objEnd + 1);
    const parsedObj = parseJsonSafely(candidate);
    if (parsedObj != null) return parsedObj;
  }

  return cleaned;
}

function quoteTableSql(name: string): string {
  const parts = name.split(".");
  return parts.map((p) => `"${p.replace(/"/g, '""')}"`).join(".");
}

export default function SupabasePage() {
  const [sql, setSql] = useState("select now();");
  const [nlPrompt, setNlPrompt] = useState("Liste-moi les 5 premiers pays de France en PIB.");
  const [resultValue, setResultValue] = useState<unknown | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [schemaTables, setSchemaTables] = useState<SchemaTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState<string | null>(null);

  const loadSchemaTables = useCallback(async () => {
    setTablesLoading(true);
    setTablesError(null);
    try {
      const response = await fetchBackend("/api/supabase/tables");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSchemaTables([]);
        setTablesError(typeof data?.error === "string" ? data.error : "Impossible de charger les tables.");
        return;
      }
      const list = Array.isArray(data?.tables) ? (data.tables as SchemaTable[]) : [];
      setSchemaTables(list);
    } catch {
      setSchemaTables([]);
      setTablesError("Impossible de charger les tables.");
    } finally {
      setTablesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchemaTables();
  }, [loadSchemaTables]);

  function isReadOnlySql(query: string): boolean {
    const trimmed = query.trim().replace(/;+$/g, "");
    if (!trimmed) return false;
    // Interdit les mots-clés d'écriture/danger.
    const forbidden = /\b(insert|update|delete|alter|drop|truncate|create|grant|revoke|comment|merge)\b/i;
    if (forbidden.test(trimmed)) return false;
    // Autorise uniquement les requêtes qui commencent par des commandes de lecture.
    const startsReadOnly = /^(select|with|show|explain|describe)\b/i.test(trimmed);
    return startsReadOnly;
  }

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultValue(null);
    setResultText(null);
    setLoading(true);
    if (!isReadOnlySql(sql)) {
      setLoading(false);
      setError("Seules les requêtes SQL de lecture (SELECT/WITH/SHOW/EXPLAIN/DESCRIBE) sont autorisées.");
      return;
    }
    try {
      const response = await fetchBackend("/api/mcp/call", {
        method: "POST",
        body: JSON.stringify({
          toolName: "execute_sql",
          arguments: { query: sql },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? "Erreur lors de l'exécution SQL.");
        return;
      }
      if (data?.isError) {
        setError(extractMcpErrorMessage(data.content) || "Erreur renvoyée par le MCP Supabase.");
        return;
      }
      // Le MCP renvoie souvent `content: [{ type: "text", text: "..." }]` avec un wrapper "untrusted-data".
      const content = (data as any)?.content ?? data;
      const payload = parseMcpResultPayload(content);
      const extractedText =
        typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
      setResultValue(payload);
      setResultText(extractedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSql(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultValue(null);
    setResultText(null);
    const prompt = nlPrompt.trim();
    if (!prompt) {
      setError("Écris une demande (en français) pour générer la requête SQL.");
      return;
    }
    try {
      setGenerating(true);
      const response = await fetchBackend("/api/supabase/sql-from-prompt", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          data?.error ??
            data?.message ??
            (typeof data === "string" ? data : null) ??
            "Erreur lors de la génération SQL.",
        );
        return;
      }
      if (typeof data?.sql !== "string" || !data.sql.trim()) {
        setError(data?.error ?? data?.message ?? "Aucun SQL généré.");
        return;
      }
      setSql(data.sql);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setGenerating(false);
    }
  }

  function isPlainObject(v: unknown): v is Record<string, unknown> {
    if (!v || typeof v !== "object") return false;
    if (Array.isArray(v)) return false;
    return Object.prototype.toString.call(v) === "[object Object]";
  }

  function renderResult() {
    if (resultValue == null) return null;

    if (Array.isArray(resultValue)) {
      const rows = resultValue.slice(0, 50);
      const allObj = rows.every((r) => isPlainObject(r));
      if (!allObj) {
        return (
          <div className="rounded-2xl border border-white/10 bg-black/70 p-3">
            <div className="text-[11px] text-text-dim mb-2">Résultat (liste)</div>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/70 p-3 text-xs text-text-muted sm:max-h-60">
              {resultText ?? JSON.stringify(resultValue, null, 2)}
            </pre>
          </div>
        );
      }

      const columns = Array.from(
        rows.reduce((acc, row) => {
          Object.keys(row as Record<string, unknown>).forEach((k) => acc.add(k));
          return acc;
        }, new Set<string>()),
      );

      return (
        <div className="rounded-2xl border border-white/10 bg-black/70 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[11px] text-text-dim">Résultat (table)</div>
            {resultValue.length > 50 && (
              <div className="text-[11px] text-text-dim">{`Affichage de 50/${resultValue.length} lignes`}</div>
            )}
          </div>
          <div className="max-h-56 overflow-auto rounded-xl border border-white/10 sm:max-h-60">
            <table className="min-w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-black/90">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="border-b border-white/10 px-3 py-2 text-left font-semibold text-text-muted">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="even:bg-white/0 odd:bg-white/[0.02]">
                    {columns.map((c) => {
                      const v = (row as Record<string, unknown>)[c];
                      const text =
                        v == null
                          ? ""
                          : typeof v === "string" || typeof v === "number" || typeof v === "boolean"
                            ? String(v)
                            : JSON.stringify(v);
                      return (
                        <td key={c} className="border-b border-white/10 px-3 py-2 text-text-muted">
                          <span className="block max-w-72 overflow-hidden text-ellipsis whitespace-nowrap">{text}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultValue.length > 50 && (
            <div className="mt-2 text-[11px] text-text-dim">{`Conseil : ajoute un LIMIT pour réduire le volume.`}</div>
          )}
        </div>
      );
    }

    if (isPlainObject(resultValue)) {
      const obj = resultValue as Record<string, unknown>;
      const entries = Object.entries(obj).slice(0, 80);
      return (
        <div className="rounded-2xl border border-white/10 bg-black/70 p-3">
          <div className="text-[11px] text-text-dim mb-2">Résultat (objet)</div>
          <div className="grid grid-cols-1 gap-2">
            {entries.map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-black/60 px-3 py-2">
                <div className="text-[11px] text-text-dim">{k}</div>
                <div className="mt-1 break-words text-xs text-text-muted">
                  {v == null ? "" : typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v)}
                </div>
              </div>
            ))}
          </div>
          {Object.keys(obj).length > entries.length && (
            <div className="mt-2 text-[11px] text-text-dim">{`Affichage partiel (${entries.length}/${Object.keys(obj).length}).`}</div>
          )}
        </div>
      );
    }

    // Fallback : texte préformaté.
    return (
      <div className="rounded-2xl border border-white/10 bg-black/70 p-3">
        <div className="text-[11px] text-text-dim mb-2">Résultat</div>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/70 p-3 text-xs text-text-muted sm:max-h-60">
          {typeof resultValue === "string" ? resultValue : resultText ?? JSON.stringify(resultValue, null, 2)}
        </pre>
      </div>
    );
  }

  function insertTableIntoEditor(tableName: string) {
    const q = quoteTableSql(tableName);
    setSql(`select * from ${q} limit 20`);
  }

  return (
    <PageMotion className="flex max-h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:items-stretch lg:gap-4">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/8 bg-black/70 shadow-[0_18px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-5">
            <header className="mb-3 flex shrink-0 items-center justify-between gap-2">
              <h1 className="text-lg font-display font-semibold text-text-primary">Supabase SQL</h1>
              <span className="text-[11px] uppercase tracking-[0.2em] text-text-dim">Éditeur</span>
            </header>

            <form onSubmit={handleGenerateSql} className="mb-4 space-y-2">
              <textarea
                value={nlPrompt}
                onChange={(e) => setNlPrompt(e.target.value)}
                className="h-20 w-full resize-none rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-cyan/60"
                spellCheck={false}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-text-dim">
                  Génère un SQL de lecture (SELECT) via le MCP Supabase.
                </span>
                <button
                  type="submit"
                  disabled={generating}
                  className="rounded-full bg-accent-cyan/80 px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-accent-cyan disabled:opacity-60"
                >
                  {generating ? "Génération…" : "Générer la requête"}
                </button>
              </div>
            </form>

            <form onSubmit={handleRun} className="mb-4 space-y-2">
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/60 px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-accent-cyan/60 sm:h-32"
                spellCheck={false}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-text-dim">La requête est exécutée via le MCP Supabase.</span>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-accent-cyan/80 px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-accent-cyan disabled:opacity-60"
                >
                  {loading ? "Exécution…" : "Exécuter la requête"}
                </button>
              </div>
            </form>

            {error && (
              <div className="mb-4 shrink-0 rounded-2xl border border-accent-rose/40 bg-accent-rose/10 px-3 py-2 text-xs text-accent-rose">
                {error}
              </div>
            )}

            {resultValue != null && <div className="pb-2">{renderResult()}</div>}
          </div>
        </section>

        <aside className="flex max-h-[42vh] min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-3xl border border-white/8 bg-black/60 shadow-[0_12px_36px_rgba(0,0,0,0.75)] backdrop-blur-xl lg:max-h-none lg:h-auto lg:w-[272px] lg:self-stretch">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
            <h2 className="text-sm font-semibold text-text-primary">Tables</h2>
            <button
              type="button"
              onClick={() => void loadSchemaTables()}
              disabled={tablesLoading}
              className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-text-muted hover:bg-white/15 disabled:opacity-50"
            >
              {tablesLoading ? "…" : "Actualiser"}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2">
            {tablesLoading && schemaTables.length === 0 ? (
              <p className="px-2 py-3 text-xs text-text-muted">Chargement...</p>
            ) : tablesError ? (
              <p className="px-2 py-3 text-xs text-accent-rose/90">{tablesError}</p>
            ) : schemaTables.length === 0 ? (
              <p className="px-2 py-3 text-xs text-text-muted">Aucune table dans le schéma public.</p>
            ) : (
              <ul className="space-y-1">
                {schemaTables.map((t) => (
                  <li key={t.name}>
                    <details className="group rounded-xl border border-white/10 bg-black/40">
                      <summary className="cursor-pointer list-none px-2 py-2 text-xs font-mono text-accent-cyan hover:bg-white/5">
                        <span className="inline text-text-primary">{t.name}</span>
                      </summary>
                      <div className="border-t border-white/5 px-2 pb-2 pt-1">
                        {t.columns.length > 0 ? (
                          <ul className="max-h-40 space-y-0.5 overflow-y-auto text-[10px] text-text-dim">
                            {t.columns.map((c) => (
                              <li key={`${t.name}-${c.name}`} className="flex justify-between gap-2">
                                <span className="truncate text-text-muted">{c.name}</span>
                                <span className="shrink-0 text-text-dim">{c.type}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[10px] text-text-dim">(colonnes non listées)</p>
                        )}
                        <button
                          type="button"
                          onClick={() => insertTableIntoEditor(t.name)}
                          className="mt-2 w-full rounded-lg bg-accent-cyan/15 py-1.5 text-[11px] text-accent-cyan hover:bg-accent-cyan/25"
                        >
                          Insérer SELECT dans l&apos;éditeur
                        </button>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="shrink-0 border-t border-white/10 px-3 py-2 text-[10px] leading-snug text-text-dim">
            Liste fournie par le MCP Supabase (schéma public). Les noms t’aident à écrire du SQL ou une demande en langage naturel.
          </p>
        </aside>
      </div>
    </PageMotion>
  );
}

