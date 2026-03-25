"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export type OrbitBubble = {
  id: string;
  label: string;
  subtitle: string;
  href: string;
  toneClass: string;
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 28 },
  },
};

export function DashboardAgentShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26, delay: 0.05 }}
      className="relative flex h-[13.5rem] w-[13.5rem] items-center justify-center"
    >
      {children}
    </motion.div>
  );
}

export default function DashboardOrbit({ bubbles }: { bubbles: OrbitBubble[] }) {
  return (
    <motion.div
      className="grid w-full max-w-lg grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-4 sm:gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {bubbles.map((bubble) => (
        <motion.div key={bubble.id} variants={item} className="flex justify-center">
          <Link
            href={bubble.href}
            className={`dashboard-tool-bubble flex h-24 w-24 flex-col items-center justify-center rounded-full border text-[11px] text-text-primary backdrop-blur-2xl transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:scale-[1.06] active:scale-[0.98] ${bubble.toneClass}`}
          >
            <span className="font-semibold">{bubble.label}</span>
            <span className="mt-0.5 text-[10px] text-text-muted/90">{bubble.subtitle}</span>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
