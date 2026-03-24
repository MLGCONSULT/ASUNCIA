import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageMotion from "@/components/PageMotion";
import ToolCards from "@/components/ToolCards";
import DashboardToday from "@/components/DashboardToday";

type Bubble = {
  id: string;
  label: string;
  subtitle: string;
  href: string;
  tone: "cyan" | "violet" | "fuchsia" | "amber" | "emerald";
};

const integrationBubbles: Bubble[] = [
  { id: "airtable", label: "Airtable", subtitle: "Bases", href: "/app/airtable", tone: "fuchsia" },
  { id: "notion", label: "Notion", subtitle: "Notes", href: "/app/notion", tone: "violet" },
  { id: "n8n", label: "n8n", subtitle: "Flows", href: "/app/n8n", tone: "amber" },
  { id: "supabase", label: "Supabase", subtitle: "SQL IA", href: "/app/supabase", tone: "emerald" },
];

const toneClasses: Record<Bubble["tone"], string> = {
  cyan: "dashboard-tool-bubble-cyan",
  violet: "dashboard-tool-bubble-violet",
  fuchsia: "dashboard-tool-bubble-fuchsia",
  amber: "dashboard-tool-bubble-amber",
  emerald: "dashboard-tool-bubble-emerald",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: profile }, { count: convCount }] = await Promise.all([
    supabase.from("profiles").select("nom_affichage").maybeSingle(),
    supabase.from("ai_conversations").select("id", { count: "exact", head: true }),
  ]);

  return (
    <PageMotion className="dashboard-scene relative isolate flex h-full min-h-0 flex-col gap-4 overflow-visible">
      <section className="relative flex min-h-[360px] items-center justify-center px-4 py-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(147,51,234,0.12),transparent_55%)]" />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-6">
          <div className="flex w-full items-center justify-between text-xs text-text-dim">
            <span className="uppercase tracking-[0.2em]">Tableau de bord</span>
            {profile?.nom_affichage ? <span>{profile.nom_affichage}</span> : null}
          </div>

          <div className="relative flex w-full max-w-4xl flex-col items-center gap-7">
            {/* Bulle centrale Agent IA */}
            <div className="dashboard-agent-bubble relative flex h-52 w-52 flex-col items-center justify-center rounded-full border border-white/10 bg-black/80 backdrop-blur-2xl">
              <span className="text-[11px] uppercase tracking-[0.22em] text-text-dim">
                Agent IA
              </span>
              <p className="mt-1 text-lg font-display font-semibold text-text-primary">
                {profile?.nom_affichage ?? "Assistant"}
              </p>
              <Link
                href="/app/dashboard?assistant=open"
                className="mt-4 rounded-full bg-accent-cyan/80 px-5 py-2 text-xs font-medium text-black shadow-[0_12px_30px_rgba(34,211,238,0.6)] transition-transform hover:-translate-y-0.5 hover:bg-accent-cyan"
              >
                Ouvrir l’agent
              </Link>
            </div>

            {/* Anneau de bulles outils */}
            <div className="grid w-full max-w-xl grid-cols-2 gap-4 md:grid-cols-4">
              {integrationBubbles.map((bubble) => (
                <Link
                  key={bubble.id}
                  href={bubble.href}
                  className={`dashboard-tool-bubble mx-auto flex h-24 w-24 flex-col items-center justify-center rounded-full border text-[11px] text-text-primary backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.08] ${toneClasses[bubble.tone]}`}
                >
                  <span className="font-semibold">{bubble.label}</span>
                  <span className="mt-0.5 text-[10px] text-text-muted/90">{bubble.subtitle}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass-strong rounded-xl border border-white/10 p-4 card-glow">
          <p className="text-xs uppercase tracking-[0.18em] text-text-dim">Conversations IA</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">{convCount ?? 0}</p>
          <p className="text-xs text-text-muted mt-1">historique de guidage</p>
          <Link href="/app/dashboard?assistant=open" className="inline-block mt-3 text-xs text-accent-cyan hover:underline">
            Ouvrir l'assistant
          </Link>
        </div>
        <div className="glass-strong rounded-xl border border-white/10 p-4 card-glow">
          <p className="text-xs uppercase tracking-[0.18em] text-text-dim">Commencer ici</p>
          <p className="mt-2 text-sm text-text-primary">Que veux-tu faire maintenant ?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/app/n8n" className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-text-primary hover:bg-white/15">
              Voir mes workflows
            </Link>
            <Link href="/app/n8n" className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-text-primary hover:bg-white/15">
              Exécuter un workflow
            </Link>
            <Link href="/app/n8n" className="px-3 py-1.5 rounded-full bg-accent-amber/20 border border-accent-amber/35 text-xs text-amber-200 hover:bg-accent-amber/30">
              Générer un JSON n8n
            </Link>
          </div>
          <p className="text-xs text-text-muted mt-3">Astuce : commence par n8n, puis ouvre l'assistant si tu veux être guidé pas à pas.</p>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-text-primary">Outils et statut</p>
        <ToolCards />
      </section>

      <DashboardToday />
    </PageMotion>
  );
}
