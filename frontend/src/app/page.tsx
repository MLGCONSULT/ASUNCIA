"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(147,51,234,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-10 h-56 w-56 rounded-full bg-accent-cyan/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-60 w-60 rounded-full bg-accent-violet/15 blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Carte centrale */}
        <div className="w-full max-w-2xl rounded-[32px] border border-white/8 bg-black/80 px-8 py-9 shadow-[0_30px_80px_rgba(0,0,0,0.9)] backdrop-blur-3xl sm:px-10 sm:py-10">
          <div className="mb-7 flex items-center justify-center">
            <div className="relative flex items-center gap-4 rounded-[28px] border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-white/0 px-6 py-3 shadow-[0_0_40px_rgba(96,165,250,0.35)]">
              <div className="pointer-events-none absolute -inset-1 rounded-[30px] bg-[conic-gradient(from_220deg_at_50%_50%,rgba(56,189,248,0.4),rgba(147,51,234,0.4),transparent_60%)] opacity-40 blur-xl" />
              <Image
                src="/logo.png"
                alt="AsuncIA"
                width={220}
                height={120}
                className="relative h-16 w-auto object-contain sm:h-20"
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

        {/* Bulles d’accès rapide — même périmètre que le dock (Airtable, Chatbot, Dashboard, n8n, Supabase) */}
        <div className="relative flex w-full max-w-5xl flex-wrap items-center justify-center gap-6 sm:gap-7">
          <BubbleLink
            label="Airtable"
            subtitle="Bases"
            href="/connexion?redirect=/app/airtable"
            tone="fuchsia"
            delay={0}
          />
          <BubbleLink
            label="Chatbot"
            subtitle="Stacky"
            href="/connexion?redirect=/app/chatbot"
            tone="stacky"
            delay={0.1}
          />
          <BubbleLink
            label="Tableau de bord"
            subtitle="Dashboard"
            href="/connexion?redirect=/app/dashboard"
            tone="cyan"
            delay={0.2}
          />
          <BubbleLink
            label="Workflows"
            subtitle="n8n"
            href="/connexion?redirect=/app/n8n"
            tone="amber"
            delay={0.3}
          />
          <BubbleLink
            label="Supabase"
            subtitle="Données"
            href="/connexion?redirect=/app/supabase"
            tone="emerald"
            delay={0.4}
          />
        </div>
      </motion.div>
    </main>
  );
}

type BubbleTone = "cyan" | "violet" | "fuchsia" | "amber" | "emerald" | "stacky";

const toneClasses: Record<BubbleTone, string> = {
  cyan: "border-accent-cyan/50 bg-accent-cyan/10 hover:border-accent-cyan/80 hover:bg-accent-cyan/20",
  violet: "border-accent-violet/50 bg-accent-violet/10 hover:border-accent-violet/80 hover:bg-accent-violet/20",
  fuchsia: "border-accent-fuchsia/50 bg-accent-fuchsia/10 hover:border-accent-fuchsia/80 hover:bg-accent-fuchsia/20",
  amber: "border-accent-amber/50 bg-accent-amber/10 hover:border-accent-amber/80 hover:bg-accent-amber/20",
  emerald: "border-emerald-400/50 bg-emerald-400/10 hover:border-emerald-400/80 hover:bg-emerald-400/20",
  stacky:
    "border-[#5c7cff]/55 bg-[#0047FF]/12 hover:border-[#7c9cff]/85 hover:bg-[#0047FF]/24",
};

function BubbleLink({
  label,
  subtitle,
  href,
  tone,
  delay = 0,
}: {
  label: string;
  subtitle: string;
  href: string;
  tone: BubbleTone;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: [16, 2, 16], scale: 1 }}
      transition={{
        delay,
        duration: 7.5,
        repeat: Infinity,
        repeatType: "mirror",
        ease: [0.36, 0.66, 0.04, 1],
      }}
    >
      <Link
        href={href}
        className={`relative flex h-28 w-28 flex-col items-center justify-center rounded-full border text-[11px] text-text-primary shadow-[0_24px_55px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-transform duration-300 hover:scale-110 ${toneClasses[tone]}`}
      >
        {/* Halo externe */}
        <span className="pointer-events-none absolute -inset-2 rounded-full bg-[conic-gradient(from_200deg_at_50%_50%,rgba(56,189,248,0.18),rgba(147,51,234,0.18),transparent_65%)] opacity-80 blur-xl" />
        {/* Reflet interne */}
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_60%)] opacity-80" />
        {/* Contenu */}
        <span className="relative font-semibold">{label}</span>
        <span className="relative mt-0.5 text-[10px] text-text-muted">{subtitle}</span>
      </Link>
    </motion.div>
  );
}
