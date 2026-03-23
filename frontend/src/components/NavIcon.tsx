"use client";

/**
 * Icônes de navigation au style lofi cyberpunk : contours nets, léger glow, géométrique.
 * Utiliser className pour la couleur (ex. text-accent-cyan, text-text-muted).
 */
type IconName = "chat" | "mail" | "user" | "grid" | "document" | "workflow" | "database";

const iconClass = "w-full h-full drop-shadow-[0_0_4px_currentColor]";
const stroke = 2;
const cap = "round";
const join = "round";

const icons: Record<IconName, () => React.ReactNode> = {
  chat: () => (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={cap} strokeLinejoin={join} aria-hidden>
      <path d="M21 11.5a2.5 2.5 0 0 1-2.5 2.5H7l-4 3v-3a2.5 2.5 0 0 1-2-2.5v-8A2.5 2.5 0 0 1 3.5 1h15A2.5 2.5 0 0 1 21 3.5v8z" />
      <path d="M7 7.5h10M7 11h6" />
    </svg>
  ),
  mail: () => (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={cap} strokeLinejoin={join} aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="1.5" />
      <path d="M2 7l10 6 10-6" />
    </svg>
  ),
  user: () => (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={cap} strokeLinejoin={join} aria-hidden>
      <circle cx="12" cy="7.5" r="3" />
      <path d="M5 20v-1.5a5.5 5.5 0 0 1 11 0V20" />
    </svg>
  ),
  grid: () => (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={cap} strokeLinejoin={join} aria-hidden>
      <rect x="2" y="2" width="8" height="8" rx="1.8" />
      <rect x="14" y="2" width="8" height="8" rx="1.8" />
      <rect x="2" y="14" width="8" height="8" rx="1.8" />
      <rect x="14" y="14" width="8" height="8" rx="1.8" />
      <path d="M10 6h4M6 10v4M18 10v4M10 18h4" />
    </svg>
  ),
  document: () => (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={cap} strokeLinejoin={join} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M6 12h12" />
      <path d="M6 16h12" />
      <path d="M6 8h6" />
    </svg>
  ),
  workflow: () => (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={cap} strokeLinejoin={join} aria-hidden>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8.5 6H12v5.5M15.5 6H12v5.5M12 11.5v4" />
      <path d="M12 15.5v2.5" />
    </svg>
  ),
  database: () => (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap={cap} strokeLinejoin={join} aria-hidden>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v6c0 1.66 3.13 3 7 3s7-1.34 7-3V5" />
      <path d="M5 11v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
    </svg>
  ),
};

type Props = {
  name: IconName;
  className?: string;
};

export default function NavIcon({ name, className = "w-[18px] h-[18px]" }: Props) {
  return <span className={`inline-flex items-center justify-center shrink-0 w-[18px] h-[18px] ${className}`}>{icons[name]()}</span>;
}

export type { IconName };
