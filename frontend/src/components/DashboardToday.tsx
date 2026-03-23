"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchBackend } from "@/lib/api";
import { buildAssistantPromptUrl } from "@/lib/assistant-intents";

type TodayState = {
  n8nActive: number | null;
  n8nTotal: number | null;
  airtableBases: number | null;
  airtableFirstBase: string | null;
  loading: boolean;
};

const initialState: TodayState = {
  n8nActive: null,
  n8nTotal: null,
  airtableBases: null,
  airtableFirstBase: null,
  loading: true,
};

export default function DashboardToday() {
  const [state, setState] = useState<TodayState>(initialState);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [n8nRes, airtableRes] = await Promise.all([
          fetchBackend("/api/n8n/workflows?limit=50").catch(() => null),
          fetchBackend("/api/airtable/bases").catch(() => null),
        ]);

        const n8nData = n8nRes?.ok ? await n8nRes.json().catch(() => ({})) : {};
        const airtableData = airtableRes?.ok ? await airtableRes.json().catch(() => ({})) : {};

        const workflows = Array.isArray(n8nData?.workflows) ? n8nData.workflows : [];
        const activeWorkflows = workflows.filter((w) => Boolean((w as { active?: boolean }).active));
        const bases = Array.isArray(airtableData?.bases) ? airtableData.bases : [];

        if (!active) return;
        setState({
          n8nActive: activeWorkflows.length,
          n8nTotal: workflows.length,
          airtableBases: bases.length,
          airtableFirstBase: typeof bases[0]?.name === "string" ? bases[0].name : null,
          loading: false,
        });
      } catch {
        if (!active) return;
        setState((prev) => ({ ...prev, loading: false }));
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const quickPrompt = useMemo(
    () =>
      buildAssistantPromptUrl(
        "Fais-moi un plan d'action du jour en 5 points a partir de mes workflows et bases connectees.",
      ),
    [],
  );

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">

      <div className="glass-strong rounded-xl border border-white/10 p-4 card-glow">
        <p className="text-xs uppercase tracking-[0.18em] text-text-dim">Aujourd'hui - Workflows</p>
        {state.loading ? (
          <p className="mt-2 text-sm text-text-muted">Chargement...</p>
        ) : (
          <>
            <p className="mt-2 text-2xl font-semibold text-text-primary">
              {state.n8nActive ?? 0}/{state.n8nTotal ?? 0}
            </p>
            <p className="text-xs text-text-muted mt-1">workflows actifs</p>
            <div className="mt-3 flex gap-2">
              <Link href="/app/n8n" className="text-xs text-accent-cyan hover:underline">
                Ouvrir n8n
              </Link>
              <Link
                href={buildAssistantPromptUrl("Quels workflows n8n dois-je verifier en priorite aujourd'hui ?")}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Prioriser avec IA
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="glass-strong rounded-xl border border-white/10 p-4 card-glow">
        <p className="text-xs uppercase tracking-[0.18em] text-text-dim">Aujourd'hui - Airtable</p>
        {state.loading ? (
          <p className="mt-2 text-sm text-text-muted">Chargement...</p>
        ) : (
          <>
            <p className="mt-2 text-2xl font-semibold text-text-primary">{state.airtableBases ?? 0}</p>
            <p className="text-xs text-text-muted mt-1">
              base(s) disponible(s){state.airtableFirstBase ? ` - ex: ${state.airtableFirstBase}` : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/app/airtable" className="text-xs text-accent-cyan hover:underline">
                Ouvrir Airtable
              </Link>
              <Link
                href={buildAssistantPromptUrl("Guide-moi pour verifier ma base Airtable la plus importante aujourd'hui.")}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Guider avec IA
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="lg:col-span-2 rounded-xl border border-accent-violet/25 bg-accent-violet/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-text-primary">
            Besoin d'un plan global ? L'assistant peut te proposer un plan d'action du jour base sur tes outils.
          </p>
          <Link href={quickPrompt} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs text-text-primary hover:bg-white/15">
            Generer mon plan du jour
          </Link>
        </div>
      </div>
    </section>
  );
}

