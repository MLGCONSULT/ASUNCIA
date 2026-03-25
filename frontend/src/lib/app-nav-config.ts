import type { IconName } from "@/components/NavIcon";

/** Même palette que les bulles orbit (dashboard) pour cohérence dock / header / palette. */
export type AppNavItem = {
  href: string;
  label: string;
  icon: IconName;
  accentText: string;
  accentGlow: string;
  accentBg: string;
  inactiveHover: string;
  /** Navbar header : survol type « bulle » (un seul anneau ring, pas de border doublon) */
  headerNavHover: string;
  /** Ligne résultat palette (header) : survol + sélection */
  paletteHover: string;
  paletteSelected: string;
};

function item(
  href: string,
  label: string,
  icon: IconName,
  accentText: string,
  accentGlow: string,
  accentBg: string,
  inactiveHover: string,
  headerNavHover: string,
  paletteHover: string,
  paletteSelected: string,
): AppNavItem {
  return {
    href,
    label,
    icon,
    accentText,
    accentGlow,
    accentBg,
    inactiveHover,
    headerNavHover,
    paletteHover,
    paletteSelected,
  };
}

/** Airtable — fuchsia (bulle dashboard-tool-bubble-fuchsia) */
export const appNavAirtable = item(
  "/app/airtable",
  "Airtable",
  "grid",
  "text-fuchsia-200",
  "shadow-[0_0_20px_-6px_rgba(232,121,249,0.88)]",
  "from-fuchsia-500/30 to-fuchsia-600/10",
  "hover:border-fuchsia-400/50 hover:bg-gradient-to-b hover:from-fuchsia-500/22 hover:to-fuchsia-950/25 hover:text-fuchsia-50 hover:shadow-[0_0_26px_-8px_rgba(232,121,249,0.55)]",
  "hover:ring-fuchsia-400/35 hover:bg-fuchsia-500/[0.14] hover:text-fuchsia-100 hover:shadow-[0_10px_32px_-14px_rgba(232,121,249,0.55)]",
  "hover:bg-fuchsia-500/[0.12] hover:text-fuchsia-100",
  "bg-fuchsia-500/18 text-fuchsia-100 border-l-2 border-fuchsia-400/80",
);

/** Stacky / Chatbot — #0047FF */
export const appNavChatbot = item(
  "/app/chatbot",
  "Chatbot",
  "chat",
  "text-blue-50",
  "shadow-[0_0_22px_-6px_rgba(0,71,255,0.9)]",
  "from-[#0047FF]/35 to-[#0047FF]/8",
  "hover:border-[#0047FF]/70 hover:bg-gradient-to-b hover:from-[#0047FF]/30 hover:to-[#0047FF]/12 hover:text-white hover:shadow-[0_0_28px_-10px_rgba(0,71,255,0.75)]",
  "hover:ring-[#0047FF]/45 hover:bg-[#0047FF]/18 hover:text-white hover:shadow-[0_10px_36px_-14px_rgba(0,71,255,0.55)]",
  "hover:bg-[#0047FF]/15 hover:text-blue-100",
  "bg-[#0047FF]/20 text-blue-100 border-l-2 border-[#0047FF]/70",
);

/** Tableau de bord — cyan */
export const appNavDashboard = item(
  "/app/dashboard",
  "Dashboard",
  "dashboard",
  "text-accent-cyan",
  "shadow-[0_0_28px_-4px_rgba(34,211,238,0.95)]",
  "from-cyan-400/35 to-cyan-400/10",
  "hover:border-cyan-400/50 hover:bg-gradient-to-b hover:from-cyan-400/20 hover:to-cyan-600/10 hover:text-cyan-50",
  "hover:ring-cyan-400/40 hover:bg-cyan-500/[0.16] hover:text-cyan-50 hover:shadow-[0_10px_32px_-14px_rgba(34,211,238,0.45)]",
  "hover:bg-cyan-500/[0.14] hover:text-cyan-100",
  "bg-cyan-500/18 text-cyan-100 border-l-2 border-cyan-400/75",
);

/** n8n — ambre */
export const appNavN8n = item(
  "/app/n8n",
  "Workflows",
  "workflow",
  "text-amber-300",
  "shadow-[0_0_20px_-6px_rgba(251,191,36,0.88)]",
  "from-amber-400/28 to-amber-600/10",
  "hover:border-amber-400/50 hover:bg-gradient-to-b hover:from-amber-400/20 hover:to-amber-900/20 hover:text-amber-50 hover:shadow-[0_0_24px_-8px_rgba(251,191,36,0.45)]",
  "hover:ring-amber-400/40 hover:bg-amber-500/[0.15] hover:text-amber-50 hover:shadow-[0_10px_32px_-14px_rgba(251,191,36,0.42)]",
  "hover:bg-amber-500/[0.14] hover:text-amber-100",
  "bg-amber-500/18 text-amber-100 border-l-2 border-amber-400/75",
);

/** Supabase — émeraude */
export const appNavSupabase = item(
  "/app/supabase",
  "Supabase",
  "database",
  "text-emerald-300",
  "shadow-[0_0_20px_-6px_rgba(52,211,153,0.85)]",
  "from-emerald-400/28 to-emerald-700/10",
  "hover:border-emerald-400/50 hover:bg-gradient-to-b hover:from-emerald-400/20 hover:to-emerald-950/25 hover:text-emerald-50 hover:shadow-[0_0_24px_-8px_rgba(16,185,129,0.4)]",
  "hover:ring-emerald-400/40 hover:bg-emerald-500/[0.15] hover:text-emerald-50 hover:shadow-[0_10px_32px_-14px_rgba(16,185,129,0.4)]",
  "hover:bg-emerald-500/[0.14] hover:text-emerald-100",
  "bg-emerald-500/18 text-emerald-100 border-l-2 border-emerald-400/75",
);

/** Ordre du dock bas (5 colonnes) */
export const NAV_WHEEL_ITEMS: AppNavItem[] = [
  appNavAirtable,
  appNavChatbot,
  appNavDashboard,
  appNavN8n,
  appNavSupabase,
];

/** Onglets header : dashboard en premier, puis outils */
export const NAV_HEADER_ITEMS: AppNavItem[] = [
  appNavDashboard,
  appNavAirtable,
  appNavChatbot,
  appNavN8n,
  appNavSupabase,
];

export function isAppNavActive(pathname: string, href: string): boolean {
  if (href === "/app/dashboard") return pathname === "/app/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Radial ::after au survol des bulles navbar (aligné palette orbit) */
export const NAV_HEADER_BUBBLE_GLOW: Record<string, string> = {
  [appNavAirtable.href]: "rgba(232, 121, 249, 0.34)",
  [appNavChatbot.href]: "rgba(0, 71, 255, 0.38)",
  [appNavDashboard.href]: "rgba(34, 211, 238, 0.36)",
  [appNavN8n.href]: "rgba(251, 191, 36, 0.34)",
  [appNavSupabase.href]: "rgba(52, 211, 153, 0.32)",
};
