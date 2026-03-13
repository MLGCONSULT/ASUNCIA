"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavIcon, { type IconName } from "@/components/NavIcon";
import CommandPalette from "@/components/CommandPalette";
import { createClient } from "@/lib/supabase/client";
import { fetchBackend } from "@/lib/api";

const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/app/dashboard", label: "Assistant", icon: "chat" },
  { href: "/app/mails", label: "Mails", icon: "mail" },
  { href: "/app/airtable", label: "Donnees", icon: "grid" },
  { href: "/app/notion", label: "Notion", icon: "document" },
  { href: "/app/n8n", label: "Auto", icon: "workflow" },
];

export default function NavWheel() {
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const activeIndex = NAV_ITEMS.findIndex(
    (item) =>
      pathname === item.href ||
      (item.href !== "/app/dashboard" && pathname.startsWith(item.href))
  );

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
      <footer
        className="fixed bottom-0 left-0 right-0 z-50 pt-8 pb-4 px-4 bg-surface/90 backdrop-blur-md"
        aria-label="Navigation"
      >
        {/* Délimitation en arc de cercle (bordure supérieure du footer) */}
        <div
          className="absolute left-0 right-0 top-0 h-8 border-t border-white/10 bg-surface/90 backdrop-blur-md rounded-t-[50%]"
          style={{ boxShadow: "0 -1px 0 0 rgb(255 255 255 / 0.06)" }}
          aria-hidden
        />
        <nav
          className="relative flex items-center justify-between gap-1 max-w-2xl mx-auto"
          aria-label="Navigation principale"
        >
          {NAV_ITEMS.map((item, i) => {
            const isActive = activeIndex === i;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-1 min-w-0 flex-col items-center justify-center rounded-xl py-2 transition-all duration-200 hover:scale-[1.03] ${
                  isActive
                    ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-[0_0_12px_-2px_rgba(34,211,238,0.25)]"
                    : "text-text-muted hover:bg-white/10 hover:text-text-primary border border-transparent"
                }`}
              >
                <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                <span className="mt-1 text-[11px] leading-none">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </footer>

      {/* Menu : Command palette + Déconnexion (mobile et desktop) */}
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
        <CommandPalette />
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="md:hidden p-2 rounded-lg text-text-muted hover:bg-white/10 hover:text-text-primary"
          aria-label="Menu"
          aria-expanded={showMenu}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="hidden md:block">
          <form onSubmit={handleLogout}>
            <button
              type="submit"
              className="text-sm text-text-muted hover:text-accent-rose px-3 py-1.5 rounded-lg hover:bg-accent-rose/5 transition-colors"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setShowMenu(false)}
          >
            <div className="absolute inset-0 bg-black/50" aria-hidden />
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="absolute right-4 top-14 rounded-xl glass-strong border border-white/10 p-3 min-w-[180px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-1">
                <p className="text-xs text-text-muted px-1 pb-1">Raccourci : Ctrl+K ou ⌘K</p>
                <CommandPalette />
                <form onSubmit={handleLogout}>
                  <button
                    type="submit"
                    className="w-full text-left px-3 py-2 rounded-xl text-sm text-text-muted hover:text-accent-rose hover:bg-accent-rose/5"
                  >
                    Déconnexion
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            aria-labelledby="logout-title"
          >
            <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" aria-hidden />
            <motion.div
              id="logout-title"
              className="relative glass-strong rounded-2xl border border-white/10 p-6 shadow-xl w-full max-w-sm"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-text-primary font-medium mb-4">Tu veux vraiment te déconnecter ?</p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 rounded-lg text-sm text-text-muted hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  className="px-4 py-2 rounded-lg text-sm bg-accent-rose/20 text-accent-rose hover:bg-accent-rose/30 border border-accent-rose/30"
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
