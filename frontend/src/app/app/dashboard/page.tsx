import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageMotion from "@/components/PageMotion";
import ToolCards from "@/components/ToolCards";
import DashboardToday from "@/components/DashboardToday";
import DashboardGreetingClock from "@/components/DashboardGreetingClock";
import DashboardOrbit, { DashboardAgentShell } from "@/components/DashboardOrbit";

const orbitBubbles = [
  {
    id: "airtable",
    label: "Airtable",
    subtitle: "Bases",
    href: "/app/airtable",
    toneClass: "dashboard-tool-bubble-fuchsia",
  },
  {
    id: "supabase",
    label: "Supabase",
    subtitle: "Données",
    href: "/app/supabase",
    toneClass: "dashboard-tool-bubble-emerald",
  },
  {
    id: "n8n",
    label: "n8n",
    subtitle: "Flows",
    href: "/app/n8n",
    toneClass: "dashboard-tool-bubble-amber",
  },
  {
    id: "stacky",
    label: "Stacky",
    subtitle: "Chatbot",
    href: "/app/chatbot",
    toneClass: "dashboard-tool-bubble-stacky",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("nom_affichage").maybeSingle();

  return (
    <PageMotion className="dashboard-scene relative isolate flex h-full min-h-0 flex-col gap-5 overflow-visible">
      <section className="relative flex min-h-[380px] items-center justify-center px-4 py-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(0,71,255,0.1),transparent_50%),radial-gradient(circle_at_80%_100%,rgba(147,51,234,0.12),transparent_55%)]" />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-7">
          <div className="flex w-full items-center justify-between text-xs text-text-dim transition-opacity duration-500">
            <span className="uppercase tracking-[0.2em]">Tableau de bord</span>
            {profile?.nom_affichage ? <span>{profile.nom_affichage}</span> : null}
          </div>

          <div className="relative flex w-full max-w-4xl flex-col items-center gap-8">
            <DashboardAgentShell>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-[-10%] rounded-full bg-[conic-gradient(from_200deg_at_50%_50%,rgba(56,189,248,0.35),rgba(0,71,255,0.22),rgba(147,51,234,0.35),rgba(34,211,238,0.2),transparent_70%)] opacity-90 blur-2xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-[4%] rounded-full border border-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
              />
              <div className="dashboard-agent-bubble relative z-[1] flex h-52 w-52 flex-col items-center justify-center rounded-full border border-white/15 bg-black/85 backdrop-blur-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02]">
                <span className="text-[11px] uppercase tracking-[0.28em] text-accent-cyan/90">
                  Assistant IA
                </span>
                {profile?.nom_affichage ? (
                  <p className="mt-1 px-3 text-center text-[10px] text-text-muted leading-snug">
                    Bonjour, {profile.nom_affichage}
                  </p>
                ) : null}
                <p className="mt-1.5 px-3 text-center text-base font-display font-semibold text-text-primary leading-tight sm:text-lg">
                  L’assistant te guide
                </p>
                <p className="mt-1 max-w-[13rem] text-center text-[10px] text-text-muted leading-snug">
                  Il t’accompagne pas à pas selon tes outils connectés.
                </p>
                <Link
                  href="/app/dashboard?assistant=open"
                  className="mt-4 rounded-full bg-accent-cyan px-5 py-2.5 text-xs font-semibold text-black shadow-[0_14px_36px_rgba(34,211,238,0.55)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(34,211,238,0.65)] active:translate-y-0"
                >
                  Ouvrir l’assistant
                </Link>
              </div>
            </DashboardAgentShell>

            <DashboardOrbit bubbles={orbitBubbles} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <DashboardGreetingClock nomAffichage={profile?.nom_affichage ?? null} />
        <div className="glass-strong rounded-xl border border-white/10 p-4 card-glow transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/[0.14] hover:shadow-[0_20px_50px_-28px_rgba(147,51,234,0.12)]">
          <p className="text-xs uppercase tracking-[0.18em] text-text-dim">Commencer ici</p>
          <p className="mt-2 text-sm text-text-primary">Choisis une action selon l&apos;outil le plus adapté.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/app/airtable"
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-text-primary transition-colors duration-200 hover:bg-white/15"
            >
              Explorer mes bases Airtable
            </Link>
            <Link
              href="/app/n8n"
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-text-primary transition-colors duration-200 hover:bg-white/15"
            >
              Exécuter un workflow n8n
            </Link>
            <Link
              href="/app/n8n"
              className="rounded-full border border-accent-amber/35 bg-accent-amber/20 px-3 py-1.5 text-xs text-amber-200 transition-colors duration-200 hover:bg-accent-amber/30"
            >
              Créer ou adapter une automatisation
            </Link>
            <Link
              href="/app/supabase"
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-text-primary transition-colors duration-200 hover:bg-white/15"
            >
              Explorer mes données
            </Link>
            <Link
              href="/app/chatbot"
              className="rounded-full border border-[#0047FF]/45 bg-[#0047FF]/15 px-3 py-1.5 text-xs text-blue-100 transition-all duration-200 hover:border-[#0047FF]/65 hover:bg-[#0047FF]/25"
            >
              Ouvrir Stacky (chatbot)
            </Link>
          </div>
          <p className="text-xs text-text-muted mt-3">
            Astuce : l’assistant IA peut te proposer l’outil le plus adapté à ta situation.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-text-primary">Outils et statut</p>
        <ToolCards />
      </section>

      <DashboardToday />
    </PageMotion>
  );
}
