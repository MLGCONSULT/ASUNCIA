import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageMotion from "@/components/PageMotion";
import { buildAssistantPromptUrl, dashboardIntents } from "@/lib/assistant-intents";

const ToolCards = dynamic(() => import("@/components/ToolCards"));
const dashboardSignals = [
  "Priorités",
  "Contexte",
  "Actions",
  "Connexions",
] as const;
const dashboardFlow = ["Scanner", "Choisir", "Exécuter"] as const;
const quickPrompts = dashboardIntents.slice(0, 3);

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nom_affichage")
    .maybeSingle();

  return (
    <PageMotion className="dashboard-scene relative isolate flex h-full min-h-0 flex-col gap-3 overflow-visible">
      <div className="dashboard-scene-orb dashboard-scene-orb-cyan" aria-hidden />
      <div className="dashboard-scene-orb dashboard-scene-orb-fuchsia" aria-hidden />
      <div className="dashboard-scene-orb dashboard-scene-orb-amber" aria-hidden />

      <section className="dashboard-hero-grid shrink-0 grid min-w-0 gap-3 xl:grid-cols-[1.42fr_0.92fr]">
        <div className="dashboard-stage dashboard-stage-main relative overflow-hidden p-5 sm:p-6">
          <div className="dashboard-stage-glow" />
          <div className="dashboard-stage-lava dashboard-stage-lava-cyan" />
          <div className="dashboard-stage-lava dashboard-stage-lava-fuchsia" />
          <div className="dashboard-stage-safe">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent-cyan shadow-[0_0_8px_var(--glow-cyan)]" aria-hidden />
                <span className="text-[11px] uppercase tracking-[0.2em] text-text-dim">IA</span>
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
              <div className="min-w-0">
                <h1 className="lava-text-safe lava-text-balance max-w-3xl text-[1.5rem] font-bold font-display leading-tight text-text-primary sm:text-[1.85rem]">
                  {profile?.nom_affichage ? `${profile.nom_affichage}, quoi traiter ?` : "Quoi traiter ?"}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2">
                  {quickPrompts.map((intent) => (
                    <Link
                      key={intent.id}
                      href={buildAssistantPromptUrl(intent.prompt)}
                      className="dashboard-shard-tag lava-text-safe text-xs text-text-muted transition-colors hover:text-text-primary"
                    >
                      {intent.title}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
                <div className="dashboard-cut-surface p-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    {dashboardSignals.map((signal) => (
                      <div key={signal} className="dashboard-micro-node">
                        <span className="text-xs font-medium text-text-primary">{signal}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="dashboard-cut-surface dashboard-cut-surface-accent p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {dashboardFlow.map((step) => (
                      <span key={step} className="dashboard-inline-flow text-xs text-text-primary">
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-stage dashboard-stage-side p-5 sm:p-6">
          <div className="dashboard-stage-lava dashboard-stage-lava-amber" />
          <div className="dashboard-stage-safe">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-violet/80" aria-hidden />
              <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">Process</span>
            </div>
            <div className="mt-3 grid gap-2">
              {["Vérifier", "Prioriser", "Exécuter"].map((step, index) => (
                <div key={step} className="dashboard-path-node">
                  <span className="dashboard-path-marker">{index + 1}</span>
                  <p className="lava-text-safe text-sm font-medium text-text-primary">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Outils" className="dashboard-tool-zone shrink-0">
        <div className="dashboard-tool-shell">
          <div className="dashboard-tool-shell-head">
            <span className="inline-flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">Outils</span>
              <span className="dashboard-status-cut text-[10px] text-text-muted">4</span>
            </span>
          </div>
          <ToolCards />
        </div>
      </section>
    </PageMotion>
  );
}
