"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-void" />
      <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-rose/30 to-transparent" />

      <motion.div
        className="relative z-10 text-center flex flex-col items-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src="/logo.png"
          alt="AsuncIA"
          width={140}
          height={84}
          className="mb-6 object-contain"
        />
        <h1 className="text-xl font-bold font-display text-text-primary mb-2">
          Une erreur s’est produite
        </h1>
        <p className="text-text-muted text-sm mb-6">
          On s’en occupe. Tu peux réessayer ou revenir à l’accueil.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex px-5 py-2.5 rounded-xl font-medium bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40 hover:bg-accent-cyan/25 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex px-5 py-2.5 rounded-xl font-medium bg-white/5 text-text-primary border border-white/10 hover:bg-white/10 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
          >
            Accueil
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
