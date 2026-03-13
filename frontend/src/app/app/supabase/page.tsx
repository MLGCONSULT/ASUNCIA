"use client";

import { useState } from "react";
import PageMotion from "@/components/PageMotion";
import { fetchBackend } from "@/lib/api";

export default function SupabasePage() {
  const [sql, setSql] = useState("select now();");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const response = await fetchBackend("/api/mcp/call", {
        method: "POST",
        body: JSON.stringify({
          toolName: "execute_sql",
          arguments: { sql },
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
      setResult(JSON.stringify(data.content ?? data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageMotion className="h-full flex flex-col min-h-0 px-4 py-4">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-3xl border border-white/8 bg-black/70 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-display font-semibold text-text-primary">Supabase SQL</h1>
          <span className="text-[11px] uppercase tracking-[0.2em] text-text-dim">Éditeur</span>
        </header>

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

        {result && (
          <pre className="max-h-72 overflow-auto rounded-2xl border border-white/10 bg-black/70 p-3 text-xs text-text-muted">
            {result}
          </pre>
        )}
      </section>
    </PageMotion>
  );
}

