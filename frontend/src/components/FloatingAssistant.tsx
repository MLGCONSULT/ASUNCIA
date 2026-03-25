"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import ChatAssistant from "@/components/ChatAssistant";

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("assistant") === "open") {
      setOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="pointer-events-none fixed bottom-24 right-3 z-50 flex flex-col items-end justify-end sm:bottom-28 sm:right-5 top-[calc(3.5rem+env(safe-area-inset-top,0px))]">
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="assistant-panel"
            key="assistant-panel"
            className="pointer-events-auto mb-3 flex max-h-[min(32rem,calc(100dvh-10rem))] min-h-0 w-[min(27rem,calc(100vw-1.25rem))] flex-col assistant-panel-shell overflow-hidden"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="assistant-panel-frame flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-accent-cyan">Guide intégré</p>
                  <p className="mt-1 text-xs text-text-muted">Airtable, n8n, Supabase — demande ce dont tu as besoin</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="assistant-close-cut text-xs text-text-muted transition-colors hover:text-text-primary"
                >
                  Fermer
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <ChatAssistant compact />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-auto relative flex items-center justify-center">
        <span className="assistant-fab-glow-ring" aria-hidden />
        <span className="assistant-fab-glow-soft" aria-hidden />
        <motion.button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="assistant-panel"
          title={open ? "Fermer l’assistant IA" : "Ouvrir l’assistant IA — pose une question sur tes outils"}
          aria-label={open ? "Fermer l’assistant IA" : "Ouvrir l’assistant IA"}
          className="assistant-fab relative z-[2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-cyan"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="assistant-fab-core">
            <span className="assistant-fab-logo-wrap">
              <Image src="/logo.png" alt="" width={52} height={32} className="object-contain drop-shadow-[0_2px_8px_rgba(34,211,238,0.35)]" />
            </span>
            <span className="assistant-fab-label">
              <span className="assistant-fab-label-main">{open ? "Actif" : "Assistant"}</span>
              <span className="assistant-fab-label-sub">{open ? "clique pour fermer" : "IA"}</span>
            </span>
          </span>
        </motion.button>
      </div>
    </div>
  );
}
