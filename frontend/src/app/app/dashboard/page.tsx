import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageMotion from "@/components/PageMotion";
import { buildAssistantPromptUrl, dashboardIntents } from "@/lib/assistant-intents";

const quickPrompts = dashboardIntents.slice(0, 2);

const integrationBubbles = [
  {
    id: "gmail",
    label: "Gmail",
    subtitle: "Mails",
    href: "/app/mails",
    ringClass: "border-accent-cyan/40 hover:border-accent-cyan/70",
    bgClass: "bg-accent-cyan/10 hover:bg-accent-cyan/20",
    positionClass: "md:top-6 md:left-1/2 md:-translate-x-1/2",
  },
  {
    id: "notion",
    label: "Notion",
    subtitle: "Notes",
    href: "/app/notion",
    ringClass: "border-accent-violet/40 hover:border-accent-violet/70",
    bgClass: "bg-accent-violet/10 hover:bg-accent-violet/20",
    positionClass: "md:top-24 md:right-6",
  },
  {
    id: "airtable",
    label: "Airtable",
    subtitle: "Bases",
    href: "/app/airtable",
    ringClass: "border-accent-fuchsia/40 hover:border-accent-fuchsia/70",
    bgClass: "bg-accent-fuchsia/10 hover:bg-accent-fuchsia/20",
    positionClass: "md:top-1/2 md:right-2 md:-translate-y-1/2",
  },
  {
    id: "n8n",
    label: "n8n",
    subtitle: "Flows",
    href: "/app/n8n",
    ringClass: "border-accent-amber/40 hover:border-accent-amber/70",
    bgClass: "bg-accent-amber/10 hover:bg-accent-amber/20",
    positionClass: "md:bottom-20 md:right-10",
  },
  {
    id: "supabase",
    label: "Supabase",
    subtitle: "SQL",
    href: "/app/supabase",
    ringClass: "border-emerald-400/40 hover:border-emerald-400/70",
    bgClass: "bg-emerald-400/10 hover:bg-emerald-400/20",
    positionClass: "md:bottom-10 md:left-10",
  },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nom_affichage")
    .maybeSingle();

  return (
    <PageMotion className="dashboard-scene relative isolate flex h-full min-h-0 flex-col gap-4 overflow-visible">
      <section className="relative flex min-h-[420px] flex-1 items-center justify-center px-4 py-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(147,51,234,0.12),transparent_55%)]" />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-6">
          <div className="flex w-full items-center justify-between text-xs text-text-dim">
            <span className="uppercase tracking-[0.2em]">Tableau de bord</span>
            {profile?.nom_affichage ? <span>{profile.nom_affichage}</span> : null}
          </div>

          <div className="relative h-[360px] w-full max-w-4xl">
            {/* Bulle centrale Agent IA */}
            <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/10 bg-black/70 px-10 py-8 shadow-[0_18px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-1 hover:scale-105">
              <div className="mb-3 flex flex-col items-center gap-1">
                <span className="text-[11px] uppercase tracking-[0.22em] text-text-dim">Agent IA</span>
                <p className="text-lg font-display font-semibold text-text-primary">
                  {profile?.nom_affichage ?? "Assistant"}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {quickPrompts.map((intent) => (
                  <Link
                    key={intent.id}
                    href={buildAssistantPromptUrl(intent.prompt)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent-cyan/60 hover:bg-accent-cyan/20 hover:text-text-primary"
                  >
                    {intent.title}
                  </Link>
                ))}
                <Link
                  href={buildAssistantPromptUrl("Ouvre une nouvelle session avec l'assistant et propose-moi les actions importantes du moment.")}
                  className="rounded-full bg-accent-cyan/80 px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-accent-cyan"
                >
                  Nouvelle consigne
                </Link>
              </div>
            </div>

            {/* Bulles intégrations desktop */}
            {integrationBubbles.map((bubble) => (
              <Link
                key={bubble.id}
                href={bubble.href}
                className={`group absolute hidden min-w-[130px] max-w-[170px] rounded-full border ${bubble.ringClass} ${bubble.bgClass} px-4 py-2.5 text-xs text-text-primary shadow-[0_12px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 hover:scale-105 md:flex md:flex-col md:items-start md:justify-center ${bubble.positionClass}`}
              >
                <span className="font-medium">{bubble.label}</span>
                <span className="mt-0.5 text-[11px] text-text-muted">{bubble.subtitle}</span>
              </Link>
            ))}

            {/* Vue compacte mobile */}
            <div className="absolute inset-x-0 bottom-0 flex justify-center md:hidden">
              <div className="flex w-full max-w-sm flex-wrap justify-center gap-2">
                {integrationBubbles.map((bubble) => (
                  <Link
                    key={bubble.id}
                    href={bubble.href}
                    className={`rounded-full border ${bubble.ringClass} ${bubble.bgClass} px-3 py-1.5 text-[11px] text-text-primary backdrop-blur-xl`}
                  >
                    {bubble.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageMotion>
  );
}
