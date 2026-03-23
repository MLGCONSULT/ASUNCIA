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
    <div className="pointer-events-none fixed bottom-24 right-3 z-50 sm:bottom-28 sm:right-5">
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="assistant-panel"
            className="pointer-events-auto mb-3 h-[min(40rem,calc(100dvh-7rem))] w-[min(27rem,calc(100vw-1.25rem))] assistant-panel-shell overflow-hidden"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="assistant-panel-frame flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-accent-cyan">Assistant IA</p>
                  <p className="mt-1 text-xs text-text-muted">Accessible depuis chaque page</p>
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

      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="pointer-events-auto assistant-fab"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="assistant-fab-core">
          <span className="assistant-fab-logo-wrap">
            <Image src="/logo.png" alt="Ouvrir l'assistant IA" width={58} height={36} className="object-contain" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-text-dim">
            {open ? "actif" : "ouvrir"}
          </span>
        </span>
      </motion.button>
    </div>
  );
}
