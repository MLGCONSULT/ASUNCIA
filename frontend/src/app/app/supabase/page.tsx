"use client";

import { useState } from "react";
import PageMotion from "@/components/PageMotion";
import { fetchBackend } from "@/lib/api";

export default function SupabasePage() {
  const [sql, setSql] = useState("select now();");
  const [nlPrompt, setNlPrompt] = useState("Liste-moi les 5 premiers pays de France en PIB.");
  const [resultValue, setResultValue] = useState<unknown | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

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
        setError(typeof data.content === "string" ? data.content : "Erreur renvoyée par le MCP Supabase.");
        return;
      }
      // Le MCP renvoie souvent `content: [{ type: "text", text: "..." }]`.
      const content = (data as any)?.content ?? data;
      const extractedText =
        typeof content === "string"
          ? content
          : Array.isArray(content)
            ? (content.find((p: any) => p?.type === "text" && typeof p?.text === "string")?.text as string | undefined) ??
              JSON.stringify(content, null, 2)
            : typeof content === "object"
              ? JSON.stringify(content, null, 2)
              : String(content ?? "");

      // Tentative de parsing JSON pour afficher un tableau.
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(extractedText);
      } catch {
        parsed = null;
      }

      setResultValue(parsed ?? extractedText);
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
        setError(data?.error ?? "Erreur lors de la génération SQL.");
        return;
      }
      if (typeof data?.sql !== "string" || !data.sql.trim()) {
        setError(data?.error ?? "Aucun SQL généré.");
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
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/70 p-3 text-xs text-text-muted">
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
          <div className="max-h-72 overflow-auto rounded-xl border border-white/10">
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
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/70 p-3 text-xs text-text-muted">
          {typeof resultValue === "string" ? resultValue : resultText ?? JSON.stringify(resultValue, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <PageMotion className="h-full flex flex-col min-h-0 px-4 py-4">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-3xl border border-white/8 bg-black/70 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-display font-semibold text-text-primary">Supabase SQL</h1>
          <span className="text-[11px] uppercase tracking-[0.2em] text-text-dim">Éditeur</span>
        </header>

        <form onSubmit={handleGenerateSql} className="space-y-3">
          <textarea
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            className="h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-cyan/60"
            spellCheck={false}
          />
          <div className="flex items-center justify-between gap-2">
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

        <form onSubmit={handleRun} className="space-y-3">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            className="h-40 w-full resize-none rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-cyan/60"
            spellCheck={false}
          />
          <div className="flex items-center justify-between gap-2">
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
          <div className="rounded-2xl border border-accent-rose/40 bg-accent-rose/10 px-3 py-2 text-xs text-accent-rose">
            {error}
          </div>
        )}

        {resultValue != null && renderResult()}
      </section>
    </PageMotion>
  );
}

