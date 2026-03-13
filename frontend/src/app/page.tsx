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
        <div className="mb-7 flex items-center justify-center">
          <div className="h-14 w-40 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-center gap-2">
            <Image
              src="/logo.png"
              alt="AsuncIA"
              width={100}
              height={60}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
        </div>

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
      </motion.div>
    </main>
  );
}
