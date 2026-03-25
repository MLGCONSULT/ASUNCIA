"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import NavIcon, { type IconName } from "@/components/NavIcon";
import { buildAssistantPromptUrl, dashboardIntents } from "@/lib/assistant-intents";

type CommandItem = {
  id: string;
  kind: "navigate" | "intent";
  href: string;
  label: string;
  hint: string;
  icon: IconName;
};

const COMMANDS: CommandItem[] = [
  { id: "dashboard", kind: "navigate", href: "/app/dashboard", label: "Ouvrir le tableau de bord", hint: "Vue d’ensemble et assistant", icon: "chat" },
  { id: "airtable", kind: "navigate", href: "/app/airtable", label: "Ouvrir Airtable", hint: "Bases et enregistrements", icon: "grid" },
  { id: "notion", kind: "navigate", href: "/app/notion", label: "Ouvrir Notion", hint: "Pages et bases", icon: "document" },
  { id: "n8n", kind: "navigate", href: "/app/n8n", label: "Ouvrir n8n", hint: "Automatisations", icon: "workflow" },
  { id: "supabase", kind: "navigate", href: "/app/supabase", label: "Ouvrir Supabase", hint: "Données et requêtes", icon: "database" },
  ...dashboardIntents.map((intent) => ({
    id: intent.id,
    kind: "intent" as const,
    href: buildAssistantPromptUrl(intent.prompt),
    label: intent.title,
    hint: intent.description,
    icon: "chat" as IconName,
  })),
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(0);
  const router = useRouter();

  const filtered = search.trim()
    ? COMMANDS.filter((c) => `${c.label} ${c.hint}`.toLowerCase().includes(search.trim().toLowerCase()))
    : COMMANDS;

  useEffect(() => {
    setSelected((s) => (s >= filtered.length ? Math.max(0, filtered.length - 1) : s));
  }, [filtered.length]);

  const openPalette = useCallback(() => {
    setOpen(true);
    setSearch("");
    setSelected(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        if (!open) {
          setSearch("");
          setSelected(0);
        }
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        closePalette();
        return;
      }
      if (e.key === "ArrowDown") {
        if (filtered.length === 0) return;
        e.preventDefault();
        setSelected((s) => (s + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        if (filtered.length === 0) return;
        e.preventDefault();
        setSelected((s) => (s - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" && filtered[selected]) {
        e.preventDefault();
        router.push(filtered[selected].href);
        closePalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closePalette, filtered, selected, router]);

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 text-xs border border-white/10"
      >
        <kbd className="font-sans">⌘</kbd>
        <span>K</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-void/80 backdrop-blur-sm z-[100]"
              onClick={closePalette}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-label="Actions rapides"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-md z-[101] px-4"
            >
              <div className="glass-strong rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 p-3 border-b border-white/10">
                  <span className="text-text-muted">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelected(0);
                    }}
                    placeholder="Aller a… ou demander une action"
                    className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-dim text-sm"
                    autoFocus
                  />
                  <kbd className="text-text-dim text-xs">Esc</kbd>
                </div>
                <ul className="max-h-[280px] overflow-y-auto py-2">
                  {filtered.length === 0 ? (
                    <li className="px-4 py-3 text-text-muted text-sm">Aucun résultat</li>
                  ) : (
                    filtered.map((cmd, i) => (
                      <li key={cmd.id}>
                        <button
                          type="button"
                          onClick={() => {
                            router.push(cmd.href);
                            closePalette();
                          }}
                          onMouseEnter={() => setSelected(i)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                            i === selected ? "bg-accent-cyan/15 text-accent-cyan" : "text-text-primary hover:bg-white/5"
                          }`}
                        >
                          <NavIcon name={cmd.icon} className="w-[18px] h-[18px] opacity-80" />
                          <div className="min-w-0">
                            <div>{cmd.label}</div>
                            <div className="text-xs text-text-dim">{cmd.hint}</div>
                          </div>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
