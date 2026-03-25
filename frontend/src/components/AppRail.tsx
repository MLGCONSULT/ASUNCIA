"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavIcon, { type IconName } from "@/components/NavIcon";
import CommandPalette from "@/components/CommandPalette";
import { createClient } from "@/lib/supabase/client";
import { fetchBackend } from "@/lib/api";

type NavItem = { href: string; label: string; icon: IconName };

const NAV_ITEMS: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: "chat" },
  { href: "/app/airtable", label: "Airtable", icon: "grid" },
  { href: "/app/notion", label: "Notion", icon: "document" },
  { href: "/app/n8n", label: "Workflows", icon: "workflow" },
  { href: "/app/supabase", label: "Supabase", icon: "database" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/app/dashboard") return pathname === "/app/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppRail() {
  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <aside
        className="fixed left-0 top-0 bottom-0 z-50 w-[76px] hidden md:flex flex-col glass-strong border-r border-white/10 rail-asymmetric ml-0 mt-3 mb-3"
        aria-label="Navigation"
      >
        <div className="flex flex-col flex-1 py-5 gap-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`relative flex items-center justify-center w-12 h-12 mx-auto rounded-2xl transition-all duration-200 group ${
                  active
                    ? "text-accent-cyan bg-accent-cyan/10 shadow-[0_0_20px_-6px_var(--glow-cyan)]"
                    : "text-text-muted hover:text-text-primary hover:bg-white/5 rounded-[1.25rem]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="rail-pill"
                    className="absolute inset-0 rounded-2xl border border-accent-cyan/30"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative w-7 h-7 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <NavIcon name={item.icon} className="w-7 h-7" />
                </span>
                <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-2xl bg-background/95 border border-white/10 text-xs font-medium text-text-primary opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 panel-asymmetric-sm">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="border-t border-white/10 py-3 flex flex-col gap-2">
          <div className="flex justify-center">
            <CommandPalette />
          </div>
          <form onSubmit={handleLogout} className="flex justify-center">
            <button
              type="submit"
              title="Déconnexion"
              className="p-3 rounded-2xl text-text-muted hover:text-accent-rose hover:bg-accent-rose/5 transition-colors duration-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </form>
        </div>
      </aside>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-center justify-around py-3 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/10 glass-strong rounded-t-[2rem]"
        aria-label="Navigation"
      >
        {NAV_ITEMS.map((item) => {
          const navActive = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={navActive ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-2xl min-w-[52px] transition-colors ${
                navActive
                  ? "text-accent-cyan bg-accent-cyan/10 rounded-[1.25rem]"
                  : "text-text-muted hover:text-text-primary hover:bg-white/5"
              }`}
            >
              <NavIcon name={item.icon} className="w-6 h-6" />
              <span className="text-[10px] font-medium truncate max-w-[64px]">
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl text-text-muted hover:text-text-primary hover:bg-white/5 min-w-[48px]"
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[10px] font-medium">Plus</span>
        </button>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-modal="true"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-[2.5rem] glass-strong border-t border-white/10 p-4 pb-[env(safe-area-inset-bottom)] panel-asymmetric"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-text-primary">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/10 text-text-muted"
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <CommandPalette />
                <form onSubmit={handleLogout}>
                  <button
                    type="submit"
                    className="w-full px-4 py-3 rounded-xl text-sm text-text-muted hover:text-accent-rose hover:bg-accent-rose/5 transition-colors text-left"
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 min-h-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogoutConfirm(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" aria-hidden />
            <div className="relative flex items-center justify-center w-full max-w-sm px-4">
              <motion.div
                id="logout-title"
                className="glass-strong rounded-2xl border border-white/10 p-6 shadow-xl w-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-text-primary font-medium mb-4">
                  Tu veux vraiment te déconnecter ?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="px-4 py-2 rounded-lg text-sm text-text-muted hover:bg-white/5 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={confirmLogout}
                    className="px-4 py-2 rounded-lg text-sm bg-accent-rose/20 text-accent-rose hover:bg-accent-rose/30 border border-accent-rose/30 transition-colors"
                  >
                    Déconnexion
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
