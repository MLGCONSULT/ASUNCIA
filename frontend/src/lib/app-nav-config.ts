import type { IconName } from "@/components/NavIcon";

/** Dock bas, palette et recherche — aligné sur les bulles orbit du dashboard. */
export type AppNavItem = {
  href: string;
  label: string;
  icon: IconName;
  accentText: string;
  accentGlow: string;
  accentBg: string;
  inactiveHover: string;
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
    paletteHover,
    paletteSelected,
  };
}

/** Airtable — fuchsia */
export const appNavAirtable = item(
  "/app/airtable",
  "Airtable",
  "grid",
  "text-fuchsia-200",
  "shadow-[0_0_20px_-6px_rgba(232,121,249,0.88)]",
  "from-fuchsia-500/30 to-fuchsia-600/10",
  "hover:border-fuchsia-400/50 hover:bg-gradient-to-b hover:from-fuchsia-500/22 hover:to-fuchsia-950/25 hover:text-fuchsia-50 hover:shadow-[0_0_26px_-8px_rgba(232,121,249,0.55)]",
  "hover:bg-fuchsia-500/[0.16] hover:text-fuchsia-50 hover:border-l-fuchsia-400 hover:shadow-[0_0_28px_-10px_rgba(232,121,249,0.45)]",
  "bg-fuchsia-500/20 text-fuchsia-50 border-l-2 border-fuchsia-400 shadow-[0_0_28px_-12px_rgba(232,121,249,0.42)]",
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
  "hover:bg-[#0047FF]/22 hover:text-white hover:border-l-[#5c7cff] hover:shadow-[0_0_28px_-10px_rgba(0,71,255,0.5)]",
  "bg-[#0047FF]/24 text-white border-l-2 border-[#5c7cff] shadow-[0_0_28px_-12px_rgba(0,71,255,0.45)]",
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
  "hover:bg-cyan-500/[0.18] hover:text-cyan-50 hover:border-l-cyan-400 hover:shadow-[0_0_28px_-10px_rgba(34,211,238,0.45)]",
  "bg-cyan-500/22 text-cyan-50 border-l-2 border-cyan-400 shadow-[0_0_28px_-12px_rgba(34,211,238,0.42)]",
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
  "hover:bg-emerald-500/[0.18] hover:text-emerald-50 hover:border-l-emerald-400 hover:shadow-[0_0_28px_-10px_rgba(52,211,153,0.4)]",
  "bg-emerald-500/22 text-emerald-50 border-l-2 border-emerald-400 shadow-[0_0_28px_-12px_rgba(52,211,153,0.38)]",
);

/** Config MCP — violet */
export const appNavMcp = item(
  "/app/mcp",
  "Config MCP",
  "user",
  "text-violet-200",
  "shadow-[0_0_20px_-6px_rgba(167,139,250,0.9)]",
  "from-violet-500/30 to-violet-800/10",
  "hover:border-violet-400/50 hover:bg-gradient-to-b hover:from-violet-500/20 hover:to-violet-950/25 hover:text-violet-50 hover:shadow-[0_0_24px_-8px_rgba(167,139,250,0.45)]",
  "hover:bg-violet-500/[0.18] hover:text-violet-50 hover:border-l-violet-400",
  "bg-violet-500/22 text-violet-50 border-l-2 border-violet-400",
);

/** Ordre du dock bas */
export const NAV_WHEEL_ITEMS: AppNavItem[] = [
  appNavAirtable,
  appNavChatbot,
  appNavDashboard,
  appNavN8n,
  appNavSupabase,
  appNavMcp,
];

/** Classes `dashboard-tool-bubble-*` (même rendu que l’orbit) */
export const NAV_WHEEL_ORBIT_TONE: Record<string, string> = {
  [appNavAirtable.href]: "dashboard-tool-bubble-fuchsia",
  [appNavChatbot.href]: "dashboard-tool-bubble-stacky",
  [appNavDashboard.href]: "dashboard-tool-bubble-cyan",
  [appNavN8n.href]: "dashboard-tool-bubble-amber",
  [appNavSupabase.href]: "dashboard-tool-bubble-emerald",
  [appNavMcp.href]: "dashboard-tool-bubble-fuchsia",
};

/** RGB pour le fil entre bulles (sans alpha) */
export const NAV_WHEEL_WIRE_RGB: Record<string, string> = {
  [appNavAirtable.href]: "232, 121, 249",
  [appNavChatbot.href]: "0, 71, 255",
  [appNavDashboard.href]: "34, 211, 238",
  [appNavN8n.href]: "251, 191, 36",
  [appNavSupabase.href]: "52, 211, 153",
  [appNavMcp.href]: "167, 139, 250",
};

export function isAppNavActive(pathname: string, href: string): boolean {
  if (href === "/app/dashboard") return pathname === "/app/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
