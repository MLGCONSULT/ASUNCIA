"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { buildAssistantPromptUrl } from "@/lib/assistant-intents";

const supabaseSqlAssistantPrompt =
  "Je veux un assistant SQL Supabase strictement en lecture. Quand je décris ce que je veux voir dans mes données, tu me proposes uniquement une requête SQL READ-ONLY (SELECT / WITH / SHOW / EXPLAIN, sans INSERT/UPDATE/DELETE/ALTER/DROP/TRUNCATE/CREATE). Réponds toujours en JSON avec deux clés: { \"sql\": \"...\", \"explication\": \"...\" }.";

export default function HomePage() {
  const supabaseChatUrl = buildAssistantPromptUrl(supabaseSqlAssistantPrompt);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(147,51,234,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-10 h-56 w-56 rounded-full bg-accent-cyan/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-60 w-60 rounded-full bg-accent-violet/15 blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Carte centrale */}
        <div className="w-full max-w-xl rounded-3xl border border-white/7 bg-black/75 px-6 py-7 shadow-[0_20px_55px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:px-8 sm:py-8">
          <div className="mb-6 flex items-center justify-center">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
              <Image
                src="/logo.png"
                alt="AsuncIA"
                width={110}
                height={66}
                className="h-10 w-auto object-contain"
                priority
              />
            </div>
          </div>

          <motion.div
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Link
              href="/connexion"
              className="btn-neon inline-flex flex-1 items-center justify-center px-5 py-3"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className="btn-secondary inline-flex flex-1 items-center justify-center px-5 py-3"
            >
              Créer un compte
            </Link>
          </motion.div>
        </div>

        {/* Bulles d’accès rapide */}
        <div className="relative flex w-full max-w-4xl flex-wrap items-center justify-center gap-4">
          <BubbleLink label="Gmail" subtitle="Mails" href="/connexion?redirect=/app/mails" tone="cyan" />
          <BubbleLink label="Airtable" subtitle="Bases" href="/connexion?redirect=/app/airtable" tone="fuchsia" />
          <BubbleLink label="Notion" subtitle="Notes" href="/connexion?redirect=/app/notion" tone="violet" />
          <BubbleLink label="n8n" subtitle="Flows" href="/connexion?redirect=/app/n8n" tone="amber" />
          <BubbleLink
            label="Supabase"
            subtitle="SQL IA"
            href={`/connexion?redirect=${encodeURIComponent(supabaseChatUrl)}`}
            tone="emerald"
          />
        </div>
      </motion.div>
    </main>
  );
}

type BubbleTone = "cyan" | "violet" | "fuchsia" | "amber" | "emerald";

const toneClasses: Record<BubbleTone, string> = {
  cyan: "border-accent-cyan/50 bg-accent-cyan/10 hover:border-accent-cyan/80 hover:bg-accent-cyan/20",
  violet: "border-accent-violet/50 bg-accent-violet/10 hover:border-accent-violet/80 hover:bg-accent-violet/20",
  fuchsia: "border-accent-fuchsia/50 bg-accent-fuchsia/10 hover:border-accent-fuchsia/80 hover:bg-accent-fuchsia/20",
  amber: "border-accent-amber/50 bg-accent-amber/10 hover:border-accent-amber/80 hover:bg-accent-amber/20",
  emerald: "border-emerald-400/50 bg-emerald-400/10 hover:border-emerald-400/80 hover:bg-emerald-400/20",
};

function BubbleLink({
  label,
  subtitle,
  href,
  tone,
}: {
  label: string;
  subtitle: string;
  href: string;
  tone: BubbleTone;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <Link
        href={href}
        className={`flex min-w-[150px] flex-col items-start justify-center rounded-full border px-4 py-2.5 text-xs text-text-primary shadow-[0_12px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 hover:scale-105 ${toneClasses[tone]}`}
      >
        <span className="font-medium">{label}</span>
        <span className="mt-0.5 text-[11px] text-text-muted">{subtitle}</span>
      </Link>
    </motion.div>
  );
}
