import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageMotion from "@/components/PageMotion";
import { buildAssistantPromptUrl } from "@/lib/assistant-intents";
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
  { id: "gmail", label: "Gmail", subtitle: "Mails", href: "/app/mails", tone: "cyan" },
  { id: "airtable", label: "Airtable", subtitle: "Bases", href: "/app/airtable", tone: "fuchsia" },
  { id: "notion", label: "Notion", subtitle: "Notes", href: "/app/notion", tone: "violet" },
  { id: "n8n", label: "n8n", subtitle: "Flows", href: "/app/n8n", tone: "amber" },
  { id: "supabase", label: "Supabase", subtitle: "SQL IA", href: "/app/supabase", tone: "emerald" },
];

const toneClasses: Record<Bubble["tone"], string> = {
  cyan: "border-accent-cyan/50 bg-accent-cyan/10 hover:border-accent-cyan/80 hover:bg-accent-cyan/20",
  violet:
    "border-accent-violet/50 bg-accent-violet/10 hover:border-accent-violet/80 hover:bg-accent-violet/20",
  fuchsia:
    "border-accent-fuchsia/50 bg-accent-fuchsia/10 hover:border-accent-fuchsia/80 hover:bg-accent-fuchsia/20",
  amber: "border-accent-amber/50 bg-accent-amber/10 hover:border-accent-amber/80 hover:bg-accent-amber/20",
  emerald:
    "border-emerald-400/50 bg-emerald-400/10 hover:border-emerald-400/80 hover:bg-emerald-400/20",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: profile }, { count: leadsCount }, { count: convCount }] = await Promise.all([
    supabase.from("profiles").select("nom_affichage").maybeSingle(),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("ai_conversations").select("id", { count: "exact", head: true }),
  ]);

  const talkUrl = buildAssistantPromptUrl(
    "Ouvre une nouvelle session avec l'assistant et propose-moi les actions importantes du moment pour mon CRM (leads, mails, bases, automatisations).",
  );

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
            <div className="relative flex h-52 w-52 flex-col items-center justify-center rounded-full border border-white/10 bg-black/80 shadow-[0_24px_70px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
              <span className="text-[11px] uppercase tracking-[0.22em] text-text-dim">
                Agent IA
              </span>
              <p className="mt-1 text-lg font-display font-semibold text-text-primary">
                {profile?.nom_affichage ?? "Assistant"}
              </p>
              <Link
                href={talkUrl}
                className="mt-4 rounded-full bg-accent-cyan/80 px-5 py-2 text-xs font-medium text-black shadow-[0_12px_30px_rgba(34,211,238,0.6)] transition-transform hover:-translate-y-0.5 hover:bg-accent-cyan"
              >
                Parler à l’agent
              </Link>
            </div>

            {/* Anneau de bulles outils */}
            <div className="grid w-full max-w-xl grid-cols-3 gap-4 md:grid-cols-5">
              {integrationBubbles.map((bubble) => (
                <Link
                  key={bubble.id}
                  href={bubble.href}
                  className={`mx-auto flex h-20 w-20 flex-col items-center justify-center rounded-full border text-[11px] text-text-primary shadow-[0_18px_40px_rgba(0,0,0,0.75)] backdrop-blur-2xl transition-transform duration-300 hover:scale-110 ${toneClasses[bubble.tone]}`}
                >
                  <span className="font-semibold">{bubble.label}</span>
                  <span className="mt-0.5 text-[10px] text-text-muted">{bubble.subtitle}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-strong rounded-xl border border-white/10 p-4 card-glow">
          <p className="text-xs uppercase tracking-[0.18em] text-text-dim">Leads</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">{leadsCount ?? 0}</p>
          <p className="text-xs text-text-muted mt-1">contacts dans ton CRM</p>
          <Link href="/app/supabase" className="inline-block mt-3 text-xs text-accent-cyan hover:underline">
            Explorer les données
          </Link>
        </div>
        <div className="glass-strong rounded-xl border border-white/10 p-4 card-glow">
          <p className="text-xs uppercase tracking-[0.18em] text-text-dim">Conversations IA</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">{convCount ?? 0}</p>
          <p className="text-xs text-text-muted mt-1">historique de guidage</p>
          <Link href={talkUrl} className="inline-block mt-3 text-xs text-accent-cyan hover:underline">
            Ouvrir l'assistant
          </Link>
        </div>
        <div className="glass-strong rounded-xl border border-white/10 p-4 card-glow">
          <p className="text-xs uppercase tracking-[0.18em] text-text-dim">Démarrage rapide</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/app/airtable" className="px-2.5 py-1 rounded-full bg-white/10 text-xs text-text-primary hover:bg-white/15">
              Airtable
            </Link>
            <Link href="/app/mails" className="px-2.5 py-1 rounded-full bg-white/10 text-xs text-text-primary hover:bg-white/15">
              Mails
            </Link>
            <Link href="/app/n8n" className="px-2.5 py-1 rounded-full bg-white/10 text-xs text-text-primary hover:bg-white/15">
              n8n
            </Link>
            <Link href="/app/notion" className="px-2.5 py-1 rounded-full bg-white/10 text-xs text-text-primary hover:bg-white/15">
              Notion
            </Link>
          </div>
          <p className="text-xs text-text-muted mt-3">
            Le dashboard sert de hub : vue d'ensemble + raccourcis + guidage.
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">Outils et statut</p>
          <Link href={talkUrl} className="text-xs text-text-muted hover:text-text-primary">
            Besoin d'aide ? Demander à l'IA
          </Link>
        </div>
        <ToolCards />
      </section>

      <DashboardToday />
    </PageMotion>
  );
}
