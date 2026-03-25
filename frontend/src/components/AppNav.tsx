"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavIcon, { type IconName } from "@/components/NavIcon";
import CommandPalette from "@/components/CommandPalette";
import { createClient } from "@/lib/supabase/client";
import { fetchBackend } from "@/lib/api";

type NavItem = { href: string; label: string; icon: IconName };

const LEFT_TOOLS: NavItem[] = [
  { href: "/app/airtable", label: "Airtable", icon: "grid" },
  { href: "/app/notion", label: "Notion", icon: "document" },
];

const CENTER_ITEM: NavItem = { href: "/app/dashboard", label: "Dashboard", icon: "chat" };

const RIGHT_TOOLS: NavItem[] = [
  { href: "/app/n8n", label: "Workflows", icon: "workflow" },
  { href: "/app/supabase", label: "Supabase", icon: "database" },
];

function isToolActive(pathname: string, href: string): boolean {
  if (href === "/app/dashboard") return pathname === "/app/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinkButton({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = isToolActive(pathname, item.href);
  const isCenter = item.href === "/app/dashboard";
  return (
    <Link
      href={item.href}
      className={`relative px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
        isCenter
          ? isActive
            ? "text-accent-cyan"
            : "text-text-muted hover:text-text-primary hover:bg-white/5"
          : isActive
            ? "text-accent-cyan"
            : "text-text-muted hover:text-text-primary hover:bg-white/5"
      }`}
    >
      {isActive && (
        <motion.span
          layoutId="nav-pill"
          className={`absolute inset-0 rounded-xl border ${
            isCenter
              ? "bg-accent-cyan/15 border-accent-cyan/40 shadow-[0_0_24px_-8px_var(--glow-cyan)]"
              : "bg-accent-cyan/10 border-accent-cyan/30"
          }`}
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        />
      )}
      <span className={`relative flex items-center gap-1.5 ${isCenter ? "font-semibold" : ""}`}>
        <NavIcon name={item.icon} className="opacity-80" />
        {item.label}
      </span>
    </Link>
  );
}

export default function AppNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const MOBILE_ORDER: NavItem[] = [
    CENTER_ITEM,
    ...LEFT_TOOLS,
    ...RIGHT_TOOLS,
  ];

  return (
    <>
      <header className="sticky top-0 z-50 glass-strong border-b border-white/10">
        <div className="relative flex items-center justify-between max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 min-h-[3.5rem]">
          <Link
            href="/app/dashboard"
            className="flex items-center gap-2 text-lg sm:text-xl font-bold font-display text-text-primary hover:text-accent-cyan transition-colors duration-200 shrink-0 z-10"
          >
            <Image src="/logo.png" alt="" width={48} height={30} className="object-contain sm:w-11 sm:h-7" />
            <span className="hidden sm:inline">AsuncIA</span>
          </Link>

          {/* Desktop: nav centrée */}
          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 sm:gap-1">
            <div className="flex items-center gap-0.5 rounded-2xl border border-white/10 bg-white/[0.03] px-1 py-1 backdrop-blur-sm">
              {LEFT_TOOLS.map((item) => (
                <NavLinkButton key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
            <div className="mx-1.5 flex items-center">
              <NavLinkButton item={CENTER_ITEM} pathname={pathname} />
            </div>
            <div className="flex items-center gap-0.5 rounded-2xl border border-white/10 bg-white/[0.03] px-1 py-1 backdrop-blur-sm">
              {RIGHT_TOOLS.map((item) => (
                <NavLinkButton key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0 z-10 ml-auto">
            <CommandPalette />
            <form onSubmit={handleLogout}>
              <button
                type="submit"
                className="px-3 py-2 rounded-xl text-sm text-text-muted hover:text-accent-rose hover:bg-accent-rose/5 transition-colors duration-200"
              >
                Déconnexion
              </button>
            </form>
          </div>

          <div className="flex items-center gap-2 md:hidden ml-auto">
            <form onSubmit={handleLogout}>
              <button type="submit" className="text-xs text-text-muted hover:text-accent-rose p-2">
                Déconnexion
              </button>
            </form>
            <motion.button
              type="button"
              aria-label="Menu"
              className="p-2 rounded-xl text-text-primary hover:bg-white/10"
              onClick={() => setMobileOpen((o) => !o)}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden border-t border-white/10 bg-surface/80 backdrop-blur-xl"
            >
              <nav className="flex flex-col p-4 gap-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim px-2">Navigation</p>
                {MOBILE_ORDER.map((item, i) => {
                  const isActive = isToolActive(pathname, item.href);
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                          item.href === "/app/dashboard"
                            ? isActive
                              ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/35 font-semibold"
                              : "text-text-muted hover:bg-white/5 hover:text-text-primary border border-transparent"
                            : isActive
                              ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30"
                              : "text-text-muted hover:bg-white/5 hover:text-text-primary border border-transparent"
                        }`}
                      >
                        <NavIcon name={item.icon} />
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
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
      </header>
    </>
  );
}
