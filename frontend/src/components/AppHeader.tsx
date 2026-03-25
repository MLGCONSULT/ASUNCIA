"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CommandPalette from "@/components/CommandPalette";
import { createClient } from "@/lib/supabase/client";
import { fetchBackend } from "@/lib/api";

export default function AppHeader() {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  function handleLogout(e: React.FormEvent) {
    e.preventDefault();
    setShowLogoutConfirm(true);
  }

  async function confirmLogout() {
    setShowLogoutConfirm(false);
    try {
      await fetchBackend("/api/deconnexion", { method: "POST" });
    } catch {
      // ignore
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[60] border-b border-white/10 bg-void/80 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(34,211,238,0.15)]">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/50 to-transparent" aria-hidden />
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3 sm:px-5">
          <Link
            href="/app/dashboard"
            className="flex min-w-0 items-center gap-2 text-text-primary transition-colors hover:text-accent-cyan"
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] shadow-[0_0_24px_-8px_rgba(34,211,238,0.45)]">
              <Image src="/logo.png" alt="" width={36} height={22} className="object-contain" />
            </span>
            <span className="hidden font-display text-base font-semibold tracking-tight sm:inline">AsuncIA</span>
          </Link>
          <p className="hidden min-w-0 truncate text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-cyan/90 sm:block sm:max-w-[12rem] md:max-w-md">
            Espace outils
          </p>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <CommandPalette />
            <form onSubmit={handleLogout}>
              <button
                type="submit"
                className="rounded-xl px-2 py-2 text-xs text-text-muted transition-colors hover:bg-accent-rose/10 hover:text-accent-rose sm:px-3 sm:text-sm"
              >
                <span className="sm:hidden">Déco</span>
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowLogoutConfirm(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="appheader-logout-title"
          >
            <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" aria-hidden />
            <motion.div
              id="appheader-logout-title"
              className="relative glass-strong w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-4 font-medium text-text-primary">Tu veux vraiment te déconnecter ?</p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  className="rounded-lg border border-accent-rose/30 bg-accent-rose/20 px-4 py-2 text-sm text-accent-rose hover:bg-accent-rose/30"
                >
                  Déconnexion
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
