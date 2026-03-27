"use client";

import { useEffect, useState } from "react";
import PageMotion from "@/components/PageMotion";
import { fetchBackend } from "@/lib/api";

type ConfigState = {
  supabase: { mcpUrl: string; projectRef: string; accessToken: string };
  n8n: { mcpUrl: string; accessToken: string };
  airtable: { mcpUrl: string; serverToken: string };
};

const INITIAL: ConfigState = {
  supabase: { mcpUrl: "", projectRef: "", accessToken: "" },
  n8n: { mcpUrl: "", accessToken: "" },
  airtable: { mcpUrl: "", serverToken: "" },
};

export default function McpConfigPage() {
  const [state, setState] = useState<ConfigState>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchBackend("/api/mcp/config");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || "Impossible de charger la configuration.");
          return;
        }
        setState((prev) => ({
          ...prev,
          supabase: { ...prev.supabase, mcpUrl: data?.supabase?.mcpUrl || "", projectRef: data?.supabase?.projectRef || "" },
          n8n: { ...prev.n8n, mcpUrl: data?.n8n?.mcpUrl || "" },
          airtable: { ...prev.airtable, mcpUrl: data?.airtable?.mcpUrl || "" },
        }));
      } catch {
        setError("Impossible de charger la configuration.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setInfo(null);
    setError(null);
    try {
      const res = await fetchBackend("/api/mcp/config", {
        method: "PUT",
        body: JSON.stringify({
          supabase: state.supabase,
          n8n: state.n8n,
          airtable: { ...state.airtable, runtimeMode: "server-token" },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Impossible d'enregistrer.");
        return;
      }
      setInfo("Configuration enregistrée.");
    } catch {
      setError("Impossible d'enregistrer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageMotion className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-5">
      <section className="rounded-3xl border border-white/10 bg-black/60 p-4 backdrop-blur-xl sm:p-5">
        <h1 className="text-lg font-semibold text-text-primary">Configuration MCP in-app</h1>
        <p className="mt-1 text-xs text-text-dim">Les variables sensibles sont enregistrées par utilisateur (plus besoin du .env backend pour ces providers).</p>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-black/50 p-4 text-sm text-text-muted">Chargement...</div>
      ) : (
        <>
          <section className="grid gap-3 rounded-3xl border border-white/10 bg-black/55 p-4 sm:grid-cols-2">
            <h2 className="col-span-full text-sm font-semibold text-text-primary">Supabase MCP</h2>
            <input className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm" placeholder="MCP URL (optionnel)" value={state.supabase.mcpUrl} onChange={(e) => setState((s) => ({ ...s, supabase: { ...s.supabase, mcpUrl: e.target.value } }))} />
            <input className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm" placeholder="Project ref" value={state.supabase.projectRef} onChange={(e) => setState((s) => ({ ...s, supabase: { ...s.supabase, projectRef: e.target.value } }))} />
            <input className="col-span-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm" placeholder="Access token Supabase MCP" value={state.supabase.accessToken} onChange={(e) => setState((s) => ({ ...s, supabase: { ...s.supabase, accessToken: e.target.value } }))} />
          </section>

          <section className="grid gap-3 rounded-3xl border border-white/10 bg-black/55 p-4 sm:grid-cols-2">
            <h2 className="col-span-full text-sm font-semibold text-text-primary">n8n MCP</h2>
            <input className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm" placeholder="N8N_MCP_URL" value={state.n8n.mcpUrl} onChange={(e) => setState((s) => ({ ...s, n8n: { ...s.n8n, mcpUrl: e.target.value } }))} />
            <input className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm" placeholder="N8N_MCP_ACCESS_TOKEN" value={state.n8n.accessToken} onChange={(e) => setState((s) => ({ ...s, n8n: { ...s.n8n, accessToken: e.target.value } }))} />
          </section>

          <section className="grid gap-3 rounded-3xl border border-white/10 bg-black/55 p-4 sm:grid-cols-2">
            <h2 className="col-span-full text-sm font-semibold text-text-primary">Airtable MCP (server-token)</h2>
            <input className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm" placeholder="AIRTABLE_MCP_URL" value={state.airtable.mcpUrl} onChange={(e) => setState((s) => ({ ...s, airtable: { ...s.airtable, mcpUrl: e.target.value } }))} />
            <input className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm" placeholder="AIRTABLE_MCP_TOKEN" value={state.airtable.serverToken} onChange={(e) => setState((s) => ({ ...s, airtable: { ...s.airtable, serverToken: e.target.value } }))} />
          </section>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={save} disabled={saving} className="rounded-full bg-accent-cyan/80 px-4 py-2 text-xs font-semibold text-black hover:bg-accent-cyan disabled:opacity-60">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </>
      )}

      {info && <div className="rounded-2xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{info}</div>}
      {error && <div className="rounded-2xl border border-accent-rose/40 bg-accent-rose/10 px-3 py-2 text-xs text-accent-rose">{error}</div>}
    </PageMotion>
  );
}
