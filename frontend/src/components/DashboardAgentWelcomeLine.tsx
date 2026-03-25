"use client";

import { useEffect, useState } from "react";
import { frenchTimeGreeting, profileDisplayName } from "@/lib/french-greeting";

type Props = {
  nomAffichage?: string | null;
  email?: string | null;
};

export default function DashboardAgentWelcomeLine({ nomAffichage, email }: Props) {
  const [greeting, setGreeting] = useState<"Bonjour" | "Bonsoir">("Bonjour");

  useEffect(() => {
    const tick = () => setGreeting(frenchTimeGreeting(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const who = profileDisplayName(nomAffichage, email);
  if (!who) return null;

  return (
    <p className="mt-1 px-3 text-center text-[10px] text-text-muted leading-snug">
      {greeting}, {who}
    </p>
  );
}
