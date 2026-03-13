"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(147,51,234,0.18),transparent_55%)]" />

      <motion.div
        className="relative z-10 w-full max-w-xl rounded-3xl border border-white/7 bg-black/70 px-6 py-8 shadow-[0_20px_55px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:px-8 sm:py-9"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 p-1.5">
              <Image
                src="/logo.png"
                alt="AsuncIA"
                width={80}
                height={48}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-text-dim">AsuncIA</p>
              <p className="mt-1 text-sm text-text-muted">Ton assistant IA pour suivre et agir.</p>
            </div>
          </div>
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-text-muted sm:inline-flex sm:items-center">
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-accent-cyan" />
            Accès sécurisé
          </span>
        </div>

        <motion.h1
          className="text-[1.7rem] font-display font-semibold leading-tight text-text-primary sm:text-[2rem]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          Entrez, l'assistant s'occupe de la suite.
        </motion.h1>

        <motion.p
          className="mt-3 text-sm text-text-muted"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.4 }}
        >
          Une seule interface pour voir l’essentiel et lancer les bonnes actions.
        </motion.p>

        <motion.div
          className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4 }}
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

        <div className="mt-6 border-t border-white/5 pt-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-text-dim">En pratique</p>
          <p className="mt-1.5 text-xs text-text-muted">
            Connecte-toi, vérifie tes intégrations, puis laisse l’IA te proposer les prochaines actions.
          </p>
        </div>
      </motion.div>
    </main>
  );
}
