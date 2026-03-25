"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import NavIcon, { type IconName } from "@/components/NavIcon";
import { fetchBackend } from "@/lib/api";

type ToolCard = {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: IconName;
  accent?: "cyan" | "violet" | "rose" | "fuchsia" | "amber";
};

const TOOLS: ToolCard[] = [
  {
    id: "airtable",
    href: "/app/airtable",
    label: "Airtable",
    description: "Explorer et agir.",
    icon: "grid",
    accent: "fuchsia",
  },
  {
    id: "supabase",
    href: "/app/supabase",
    label: "Supabase",
    description: "Données et requêtes.",
    icon: "database",
    accent: "cyan",
  },
  {
    id: "n8n",
    href: "/app/n8n",
    label: "Automatisations",
    description: "Lancer et contrôler.",
    icon: "workflow",
    accent: "amber",
  },
];

const accentClasses: Record<NonNullable<ToolCard["accent"]>, string> = {
  cyan: "hover:border-accent-cyan/40 hover:bg-accent-cyan/5 hover:shadow-[0_0_24px_-4px_rgba(34,211,238,0.2)]",
  violet: "hover:border-accent-violet/40 hover:bg-accent-violet/5 hover:shadow-[0_0_24px_-4px_rgba(167,139,250,0.2)]",
  rose: "hover:border-accent-rose/40 hover:bg-accent-rose/5 hover:shadow-[0_0_24px_-4px_rgba(251,113,133,0.2)]",
  fuchsia: "hover:border-accent-fuchsia/40 hover:bg-accent-fuchsia/5 hover:shadow-[0_0_24px_-4px_rgba(232,121,249,0.2)]",
  amber: "hover:border-accent-amber/40 hover:bg-accent-amber/5 hover:shadow-[0_0_24px_-4px_rgba(251,191,36,0.2)]",
};

const iconAccentClasses: Record<NonNullable<ToolCard["accent"]>, string> = {
  cyan: "text-accent-cyan",
  violet: "text-accent-violet",
  rose: "text-accent-rose",
  fuchsia: "text-accent-fuchsia",
  amber: "text-accent-amber",
};

export default function ToolCards() {
  const [statuses, setStatuses] = useState<Record<string, { connected: boolean; available: boolean; source?: string }>>({});

  useEffect(() => {
    let active = true;

    async function loadStatuses() {
      const entries = await Promise.all([
        fetchBackend("/api/auth/airtable/status")
          .then((response) => response.json())
          .then((data) => ["airtable", { connected: Boolean(data.connected), available: Boolean(data.configured), source: data.source as string | undefined }] as const)
          .catch(() => ["airtable", { connected: false, available: false }] as const),
        fetchBackend("/api/health/mcp-supabase")
          .then((response) => response.json())
          .then((data) => ["supabase", { connected: Boolean(data.ok), available: Boolean(data.ok) }] as const)
          .catch(() => ["supabase", { connected: false, available: false }] as const),
        fetchBackend("/api/health/mcp-n8n")
          .then((response) => response.json())
          .then((data) => ["n8n", { connected: Boolean(data.ok), available: Boolean(data.ok) }] as const)
          .catch(() => ["n8n", { connected: false, available: false }] as const),
      ]);

      if (!active) return;
      setStatuses(Object.fromEntries(entries));
    }

    loadStatuses();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
      {TOOLS.map((tool, i) => (
        <motion.div
          key={tool.href}
          className="min-w-0"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={`dashboard-tool-shard h-full p-3 sm:p-4 transition-all duration-300 ${accentClasses[tool.accent ?? "cyan"]}`}>
            <div className={`flex items-center justify-between gap-2 ${iconAccentClasses[tool.accent ?? "cyan"]}`}>
              <span className="dashboard-tool-icon flex h-9 w-9 shrink-0 items-center justify-center border border-white/10 bg-white/5">
                <NavIcon name={tool.icon} className="w-4 h-4" />
              </span>
              <span
                className={`dashboard-status-cut shrink-0 text-[10px] uppercase ${
                  statuses[tool.id]?.connected
                    ? "text-accent-cyan"
                    : statuses[tool.id]?.available
                      ? "text-accent-amber"
                      : "text-text-dim"
                }`}
              >
                {statuses[tool.id]?.connected
                  ? tool.id === "airtable" && statuses[tool.id]?.source === "server-token"
                    ? "Prêt"
                    : tool.id === "airtable"
                      ? "OK"
                      : "OK"
                  : statuses[tool.id]?.available
                    ? "Config"
                    : "—"}
              </span>
            </div>
            <p className="lava-text-safe mt-2 text-sm font-semibold text-text-primary">{tool.label}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2">
              <Link href={tool.href} className="dashboard-inline-link lava-text-safe text-xs text-text-primary transition-colors hover:text-accent-cyan">
                Ouvrir
              </Link>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
