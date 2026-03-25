"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavIcon, { type IconName } from "@/components/NavIcon";
import CommandPalette from "@/components/CommandPalette";
import { createClient } from "@/lib/supabase/client";
import { fetchBackend } from "@/lib/api";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  accentText: string;
  accentGlow: string;
  accentBg: string;
};

const item = (
  href: string,
  label: string,
  icon: IconName,
  accentText: string,
  accentGlow: string,
  accentBg: string,
): NavItem => ({ href, label, icon, accentText, accentGlow, accentBg });

/** 2 outils | Dashboard central | 2 outils */
const NAV_LEFT: NavItem[] = [
  item(
    "/app/airtable",
    "Airtable",
    "grid",
    "text-emerald-300",
    "shadow-[0_0_20px_-6px_rgba(110,231,183,0.8)]",
    "from-emerald-300/20 to-emerald-300/5",
  ),
  item(
    "/app/notion",
    "Notion",
    "document",
    "text-fuchsia-300",
    "shadow-[0_0_20px_-6px_rgba(240,171,252,0.8)]",
    "from-fuchsia-300/20 to-fuchsia-300/5",
  ),
];

const NAV_CENTER: NavItem = item(
  "/app/dashboard",
  "Dashboard",
  "chat",
  "text-accent-cyan",
  "shadow-[0_0_28px_-4px_rgba(34,211,238,0.95)]",
  "from-cyan-400/35 to-cyan-400/10",
);

const NAV_RIGHT: NavItem[] = [
  item(
    "/app/supabase",
    "Supabase",
    "database",
    "text-amber-300",
    "shadow-[0_0_20px_-6px_rgba(252,211,77,0.8)]",
    "from-amber-300/20 to-amber-300/5",
  ),
  item(
    "/app/n8n",
    "Workflows",
    "workflow",
    "text-violet-300",
    "shadow-[0_0_20px_-6px_rgba(196,181,253,0.8)]",
    "from-violet-300/20 to-violet-300/5",
  ),
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/app/dashboard") return pathname === "/app/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavPill({ item: nav, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, nav.href);
  return (
    <motion.div
      whileTap={{ scale: 0.93 }}
      transition={{ type: "spring", stiffness: 500, damping: 26 }}
      className="flex-1 min-w-0 max-w-[100px]"
    >
      <Link
        href={nav.href}
        title={nav.label}
        aria-current={active ? "page" : undefined}
        className={`relative overflow-hidden flex w-full flex-col items-center justify-center rounded-2xl py-2.5 px-1.5 transition-all duration-300 border ${
          active
            ? `bg-gradient-to-b ${nav.accentBg} border-white/25 ${nav.accentGlow} ${nav.accentText}`
            : "bg-white/[0.03] border-white/5 text-text-muted hover:bg-white/[0.07] hover:text-text-primary hover:border-white/20"
        }`}
      >
        {active && (
          <>
            <motion.span
              layoutId="navwheel-active-pill"
              className="absolute inset-0 rounded-2xl border border-white/25"
              transition={{ type: "spring", bounce: 0.18, duration: 0.35 }}
            />
            <motion.span
              className="absolute -top-5 left-1/2 w-14 h-14 -translate-x-1/2 rounded-full blur-xl bg-white/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              aria-hidden
            />
          </>
        )}
        <span
          className={`relative flex items-center justify-center rounded-xl px-2 py-1.5 ${active ? "bg-white/[0.1]" : ""}`}
        >
          <NavIcon name={nav.icon} className="h-5 w-5 shrink-0" />
        </span>
        <span className="relative mt-1 text-[10px] sm:text-[11px] leading-none font-semibold truncate max-w-full px-0.5">
          {nav.label}
        </span>
        {active && (
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
        )}
      </Link>
    </motion.div>
  );
}

/** Dashboard : plus visible, au centre de la barre */
function NavCenterPill({ item: nav, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, nav.href);
  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 480, damping: 28 }}
      className="relative z-[2] shrink-0 -mt-3 px-1"
    >
      <Link
        href={nav.href}
        title={nav.label}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-w-[92px] flex-col items-center justify-center rounded-2xl border-2 py-3 px-3 shadow-lg transition-all duration-300 ${
          active
            ? `bg-gradient-to-b ${nav.accentBg} border-accent-cyan/50 ${nav.accentGlow} ${nav.accentText} scale-[1.06]`
            : "bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/15 text-text-muted hover:border-accent-cyan/35 hover:text-text-primary"
        }`}
      >
        {active && (
          <motion.span
            layoutId="navwheel-center-ring"
            className="absolute -inset-[3px] rounded-[1.15rem] border border-accent-cyan/40 opacity-80"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <span className="relative flex items-center justify-center rounded-xl bg-white/[0.12] p-2 ring-1 ring-white/10">
          <NavIcon name={nav.icon} className="h-6 w-6 shrink-0" />
        </span>
        <span className="relative mt-1.5 text-[11px] font-bold tracking-wide uppercase">{nav.label}</span>
      </Link>
    </motion.div>
  );
}

export default function NavWheel() {
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
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
      <footer
        className="fixed bottom-0 left-0 right-0 z-50 pt-8 pb-3 px-2 bg-surface/75 backdrop-blur-2xl"
        aria-label="Navigation"
      >
        <div
          className="absolute left-0 right-0 top-0 h-8 border-t border-white/10 bg-gradient-to-b from-white/[0.08] to-surface/70 backdrop-blur-2xl rounded-t-[50%]"
          style={{ boxShadow: "0 -1px 0 0 rgb(255 255 255 / 0.08), 0 -18px 28px -24px rgba(125,211,252,0.45)" }}
          aria-hidden
        />
        <nav
          className="relative flex items-end justify-center gap-1 sm:gap-2 max-w-lg mx-auto px-1"
          aria-label="Navigation principale"
        >
          <div className="flex flex-1 items-end justify-end gap-1 sm:gap-1.5 min-w-0">
            {NAV_LEFT.map((nav) => (
              <NavPill key={nav.href} item={nav} pathname={pathname} />
            ))}
          </div>
          <NavCenterPill item={NAV_CENTER} pathname={pathname} />
          <div className="flex flex-1 items-end justify-start gap-1 sm:gap-1.5 min-w-0">
            {NAV_RIGHT.map((nav) => (
              <NavPill key={nav.href} item={nav} pathname={pathname} />
            ))}
          </div>
        </nav>
      </footer>

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
