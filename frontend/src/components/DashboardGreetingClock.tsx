"use client";

import { useEffect, useMemo, useState } from "react";
import { frenchTimeGreeting, profileDisplayName } from "@/lib/french-greeting";

type Props = {
  nomAffichage?: string | null;
  email?: string | null;
};

export default function DashboardGreetingClock({ nomAffichage, email }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const who = useMemo(() => profileDisplayName(nomAffichage, email), [nomAffichage, email]);

  const timeStr =
    now?.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }) ?? "—:—:—";

  const dateStr =
    now?.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }) ?? "…";

  const greeting = now ? frenchTimeGreeting(now) : null;

  const salutation =
    greeting && who != null ? `${greeting}, ${who}` : greeting != null ? greeting : "…";

  return (
    <div className="glass-strong flex min-h-[8.5rem] flex-col justify-between gap-4 rounded-xl border border-white/10 p-4 card-glow transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/[0.14] hover:shadow-[0_20px_50px_-28px_rgba(34,211,238,0.15)] sm:min-h-0 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-[0.18em] text-text-dim">Heure locale</p>
        <p className="mt-3 text-base font-medium leading-snug text-accent-cyan/95">{salutation}</p>
        <p className="mt-2 text-sm capitalize leading-snug text-text-muted">{dateStr}</p>
      </div>
      <p className="shrink-0 font-display text-[2.35rem] font-semibold leading-none tracking-tight text-text-primary tabular-nums sm:text-[2.75rem] sm:leading-none">
        {timeStr}
      </p>
    </div>
  );
}
