"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import NavIcon from "@/components/NavIcon";
import { NAV_WHEEL_ITEMS, type AppNavItem, isAppNavActive } from "@/lib/app-nav-config";

function NavPill({ item: nav, pathname }: { item: AppNavItem; pathname: string }) {
  const active = isAppNavActive(pathname, nav.href);
  return (
    <motion.div
      whileTap={{ scale: 0.93 }}
      transition={{ type: "spring", stiffness: 500, damping: 26 }}
      className="min-w-0 w-full max-w-[4.2rem] sm:max-w-[4.65rem] justify-self-center"
    >
      <Link
        href={nav.href}
        title={nav.label}
        aria-current={active ? "page" : undefined}
        className={`relative overflow-hidden flex w-full flex-col items-center justify-center rounded-[1.25rem] py-1.5 px-1 sm:rounded-[1.4rem] sm:py-2 sm:px-1.5 transition-all duration-300 border ${
          active
            ? `bg-gradient-to-b ${nav.accentBg} border-white/25 ${nav.accentGlow} ${nav.accentText}`
            : `bg-white/[0.03] border-white/5 text-text-muted ${nav.inactiveHover}`
        }`}
      >
        {active && (
          <>
            <motion.span
              layoutId="navwheel-active-pill"
              className="absolute inset-0 rounded-[1.25rem] sm:rounded-[1.4rem] border border-white/25"
              transition={{ type: "spring", bounce: 0.18, duration: 0.35 }}
            />
            <motion.span
              className="absolute -top-4 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full blur-xl bg-white/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              aria-hidden
            />
          </>
        )}
        <span
          className={`relative flex items-center justify-center rounded-xl px-1.5 py-0.8 sm:px-2 sm:py-1 ${active ? "bg-white/[0.1]" : ""}`}
        >
          <NavIcon name={nav.icon} className="h-5 w-5 shrink-0" />
        </span>
        <span className="relative mt-0.5 text-[9px] sm:text-[10px] leading-none font-semibold truncate max-w-full px-0.5 text-center">
          {nav.label}
        </span>
        {active && (
          <span className="absolute top-1 right-1 h-1 w-1 rounded-full bg-current sm:top-1.5 sm:right-1.5 sm:h-1.5 sm:w-1.5" aria-hidden />
        )}
      </Link>
    </motion.div>
  );
}

function NavCenterPill({ item: nav, pathname }: { item: AppNavItem; pathname: string }) {
  const active = isAppNavActive(pathname, nav.href);
  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 480, damping: 28 }}
      className="relative z-[2] min-w-0 w-full max-w-[4.75rem] justify-self-center -mt-0 sm:mt-0 sm:max-w-[5.15rem]"
    >
      <Link
        href={nav.href}
        title={nav.label}
        aria-current={active ? "page" : undefined}
        className={`relative flex w-full flex-col items-center justify-center rounded-[1.35rem] border-2 py-2 px-2 shadow-lg transition-all duration-300 sm:rounded-[1.5rem] sm:py-2 sm:px-3 ${
          active
            ? `bg-gradient-to-b ${nav.accentBg} border-accent-cyan/50 ${nav.accentGlow} ${nav.accentText} scale-[1.04] sm:scale-[1.06]`
            : `bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/15 text-text-muted ${nav.inactiveHover}`
        }`}
      >
        {active && (
          <motion.span
            layoutId="navwheel-center-ring"
            className="absolute -inset-[2px] rounded-[1.15rem] border border-accent-cyan/40 opacity-80 sm:rounded-[1.25rem]"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <span className="relative flex items-center justify-center rounded-xl bg-white/[0.12] p-1.5 ring-1 ring-white/10 sm:p-2">
          <NavIcon name={nav.icon} className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
        </span>
        <span className="relative mt-1 text-[9px] font-bold uppercase tracking-wide sm:mt-1.5 sm:text-[10px]">{nav.label}</span>
      </Link>
    </motion.div>
  );
}

export default function NavWheel() {
  const pathname = usePathname();

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-0 px-1 sm:px-2 bg-gradient-to-t from-void via-void/95 to-transparent pointer-events-none overflow-hidden"
      aria-label="Navigation"
    >
      <div className="pointer-events-auto mx-auto max-w-[30rem] sm:max-w-[32rem]">
        <nav
          className="grid grid-cols-5 items-end gap-0.75 sm:gap-1 rounded-[2.15rem] sm:rounded-[2.35rem] border border-white/10 bg-gradient-to-r from-fuchsia-500/[0.1] via-cyan-500/12 to-[#0047FF]/[0.11] px-1 py-1 shadow-[0_8px_40px_-10px_rgba(34,211,238,0.22),inset_0_1px_0_0_rgba(255,255,255,0.07)] ring-1 ring-white/10 backdrop-blur-xl sm:px-2 sm:py-1.25"
          aria-label="Navigation principale"
        >
          {NAV_WHEEL_ITEMS.map((nav, i) =>
            i === 2 ? (
              <NavCenterPill key={nav.href} item={nav} pathname={pathname} />
            ) : (
              <NavPill key={nav.href} item={nav} pathname={pathname} />
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
