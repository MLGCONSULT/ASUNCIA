"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import NavIcon from "@/components/NavIcon";
import {
  NAV_WHEEL_ITEMS,
  NAV_WHEEL_ORBIT_TONE,
  NAV_WHEEL_WIRE_RGB,
  type AppNavItem,
  isAppNavActive,
} from "@/lib/app-nav-config";

function wireState(
  leftIdx: number,
  rightIdx: number,
  hovered: number | null,
  active: number,
): { opacity: number; glowRgb: string | null } {
  if (hovered !== null) {
    if (hovered === rightIdx) {
      return { opacity: 1, glowRgb: NAV_WHEEL_WIRE_RGB[NAV_WHEEL_ITEMS[rightIdx].href] };
    }
    if (hovered === leftIdx) {
      return { opacity: 1, glowRgb: NAV_WHEEL_WIRE_RGB[NAV_WHEEL_ITEMS[leftIdx].href] };
    }
    return { opacity: 0.22, glowRgb: null };
  }
  if (active === rightIdx || active === leftIdx) {
    return {
      opacity: 0.68,
      glowRgb: NAV_WHEEL_WIRE_RGB[NAV_WHEEL_ITEMS[active].href],
    };
  }
  return { opacity: 0.3, glowRgb: null };
}

function WireSegment({
  leftNav,
  rightNav,
  leftIdx,
  rightIdx,
  hovered,
  active,
}: {
  leftNav: AppNavItem;
  rightNav: AppNavItem;
  leftIdx: number;
  rightIdx: number;
  hovered: number | null;
  active: number;
}) {
  const rgbL = NAV_WHEEL_WIRE_RGB[leftNav.href];
  const rgbR = NAV_WHEEL_WIRE_RGB[rightNav.href];
  const { opacity, glowRgb } = wireState(leftIdx, rightIdx, hovered, active);

  return (
    <div
      className="nav-wheel-wire h-[2px] w-full max-w-[1.05rem] rounded-full transition-all duration-300 ease-out sm:max-w-[1.4rem]"
      style={{
        background: `linear-gradient(90deg, rgba(${rgbL},0.55), rgba(${rgbR},0.55))`,
        opacity,
        boxShadow: glowRgb ? `0 0 14px 1px rgba(${glowRgb},0.55), 0 0 28px -4px rgba(${glowRgb},0.32)` : undefined,
      }}
      aria-hidden
    />
  );
}

function NavBubble({
  nav,
  pathname,
  isCenter,
}: {
  nav: AppNavItem;
  pathname: string;
  isCenter: boolean;
}) {
  const active = isAppNavActive(pathname, nav.href);
  const tone = NAV_WHEEL_ORBIT_TONE[nav.href] ?? "dashboard-tool-bubble-cyan";

  return (
    <motion.div
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 520, damping: 28 }}
      className={`relative z-[1] flex flex-col items-center ${isCenter ? "z-[3] -mx-0.5 sm:-mx-1" : ""}`}
    >
      <Link
        href={nav.href}
        title={nav.label}
        aria-current={active ? "page" : undefined}
        className={[
          "dashboard-tool-bubble relative flex h-[3.25rem] w-[3.25rem] shrink-0 flex-col items-center justify-center rounded-full border text-text-primary backdrop-blur-xl",
          "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          tone,
          isCenter ? "sm:h-[3.75rem] sm:w-[3.75rem] scale-[1.06] sm:scale-[1.08]" : "",
          active ? "opacity-100 ring-2 ring-white/25" : "opacity-[0.82] hover:opacity-100",
          active ? "" : "hover:-translate-y-0.5 hover:scale-[1.04]",
        ].join(" ")}
      >
        {active && (
          <motion.span
            layoutId="navwheel-bubble-active"
            className="pointer-events-none absolute inset-0 rounded-full border border-white/20"
            transition={{ type: "spring", bounce: 0.2, duration: 0.38 }}
          />
        )}
        <span className="relative z-[1]">
          <NavIcon name={nav.icon} className={`h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5 ${active ? nav.accentText : "text-text-primary"}`} />
        </span>
      </Link>
      <span
        className={`mt-1.5 max-w-[4.5rem] text-center text-[9px] font-semibold leading-tight sm:text-[10px] ${
          active ? nav.accentText : "text-text-muted"
        }`}
      >
        {nav.label}
      </span>
    </motion.div>
  );
}

export default function NavWheel() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<number | null>(null);

  const activeIndex = useMemo(() => {
    const i = NAV_WHEEL_ITEMS.findIndex((n) => isAppNavActive(pathname, n.href));
    return i >= 0 ? i : 0;
  }, [pathname]);

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 px-2 sm:px-3 bg-gradient-to-t from-void via-void/90 to-transparent pointer-events-none"
      aria-label="Navigation"
    >
      <div className="pointer-events-auto mx-auto flex max-w-[26rem] flex-col items-center sm:max-w-[30rem]">
        <p className="mb-1 text-[9px] font-medium uppercase tracking-[0.22em] text-text-dim/80">Navigation</p>
        <div className="w-full pb-0.5" onMouseLeave={() => setHovered(null)}>
          <nav
            className="flex w-full items-center justify-center"
            aria-label="Navigation principale"
          >
            {NAV_WHEEL_ITEMS.map((nav, i) => (
              <Fragment key={nav.href}>
                {i > 0 ? (
                  <div
                    className="flex h-11 min-w-0 flex-1 max-w-[1.5rem] cursor-default items-center justify-center sm:max-w-[1.85rem]"
                    onMouseEnter={() => setHovered(i)}
                  >
                    <WireSegment
                      leftNav={NAV_WHEEL_ITEMS[i - 1]}
                      rightNav={nav}
                      leftIdx={i - 1}
                      rightIdx={i}
                      hovered={hovered}
                      active={activeIndex}
                    />
                  </div>
                ) : null}
                <div className="flex flex-col items-center" onMouseEnter={() => setHovered(i)}>
                  <NavBubble nav={nav} pathname={pathname} isCenter={i === 2} />
                </div>
              </Fragment>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
