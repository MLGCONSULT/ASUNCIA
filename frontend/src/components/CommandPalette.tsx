"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import NavIcon, { type IconName } from "@/components/NavIcon";

/** Navigation applicative uniquement (pas de prompts assistant). */
type CommandItem = {
  id: string;
  href: string;
  label: string;
  hint: string;
  icon: IconName;
};

const COMMANDS: CommandItem[] = [
  { id: "dashboard", href: "/app/dashboard", label: "Tableau de bord", hint: "Vue d’ensemble", icon: "dashboard" },
  { id: "airtable", href: "/app/airtable", label: "Airtable", hint: "Bases et enregistrements", icon: "grid" },
  { id: "chatbot", href: "/app/chatbot", label: "Chatbot", hint: "Trouver la stack idéale", icon: "chat" },
  { id: "n8n", href: "/app/n8n", label: "n8n", hint: "Automatisations", icon: "workflow" },
  { id: "supabase", href: "/app/supabase", label: "Supabase", hint: "Données et requêtes", icon: "database" },
];

/** Bas du header fixe (h-14 + safe area) + léger décalage sous la bordure */
const HEADER_DROPDOWN_TOP = "calc(3.5rem + env(safe-area-inset-top, 0px) + 6px)";

type Props = {
  /** Barre visible dans le header + liste sous la barre. Sinon bouton ⌘K + modale centrée (AppNav / AppRail). */
  variant?: "header" | "default";
};

export default function CommandPalette({ variant = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = search.trim()
    ? COMMANDS.filter((c) => `${c.label} ${c.hint}`.toLowerCase().includes(search.trim().toLowerCase()))
    : COMMANDS;

  const clearBlurTimer = useCallback(() => {
    if (blurCloseTimer.current) {
      clearTimeout(blurCloseTimer.current);
      blurCloseTimer.current = null;
    }
  }, []);

  useEffect(() => {
    setSelected((s) => (s >= filtered.length ? Math.max(0, filtered.length - 1) : s));
  }, [filtered.length]);

  const closePalette = useCallback(() => {
    clearBlurTimer();
    setOpen(false);
  }, [clearBlurTimer]);

  const openPalette = useCallback(() => {
    clearBlurTimer();
    setOpen(true);
    setSearch("");
    setSelected(0);
    if (variant === "header") {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [clearBlurTimer, variant]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) {
            requestAnimationFrame(() => inputRef.current?.blur());
            return false;
          }
          setSearch("");
          setSelected(0);
          return true;
        });
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        closePalette();
        inputRef.current?.blur();
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

  useEffect(() => {
    if (open && variant === "header") {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, variant]);

  useEffect(() => () => clearBlurTimer(), [clearBlurTimer]);

  const scheduleCloseOnBlur = () => {
    clearBlurTimer();
    blurCloseTimer.current = setTimeout(() => setOpen(false), 200);
  };

  const onHeaderInputFocus = () => {
    clearBlurTimer();
    setOpen(true);
  };

  const renderResultsList = (panelClass: string) => (
    <ul className={`command-palette-scroll max-h-[min(52vh,300px)] overflow-y-auto bg-surface py-1.5 ${panelClass}`}>
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
                i === selected ? "bg-accent-cyan/18 text-accent-cyan" : "text-text-primary hover:bg-white/[0.06]"
              }`}
            >
              <NavIcon name={cmd.icon} className="w-[18px] h-[18px] shrink-0 opacity-90" />
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-snug">{cmd.label}</div>
                <div className="text-xs text-text-muted mt-0.5 leading-snug">{cmd.hint}</div>
              </div>
            </button>
          </li>
        ))
      )}
    </ul>
  );

  if (variant === "header") {
    return (
      <div className="relative w-full min-w-0 max-w-xl xl:max-w-2xl">
        <div className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-text-muted" aria-hidden>
          <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          enterKeyHint="go"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelected(0);
          }}
          onFocus={onHeaderInputFocus}
          onBlur={scheduleCloseOnBlur}
          placeholder="Rechercher une page…"
          aria-expanded={open}
          aria-controls="command-palette-header-results"
          className="w-full rounded-xl border border-white/14 bg-surface2/95 py-2 pl-9 pr-[4.25rem] text-sm text-text-primary shadow-inner shadow-black/20 outline-none ring-0 placeholder:text-text-dim backdrop-blur-sm transition-[border-color,box-shadow] focus:border-accent-cyan/45 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.2)] sm:py-2.5 sm:pl-10 sm:pr-[4.5rem]"
        />
        <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex" aria-hidden>
          <kbd className="rounded border border-white/12 bg-void/90 px-1.5 py-0.5 font-sans text-[10px] text-text-dim">⌘</kbd>
          <kbd className="rounded border border-white/12 bg-void/90 px-1.5 py-0.5 font-sans text-[10px] text-text-dim">K</kbd>
        </div>

        <AnimatePresence>
          {open && (
            <>
              <motion.button
                type="button"
                aria-label="Fermer la recherche"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[65] bg-void/55 backdrop-blur-[2px] sm:bg-void/40"
                onMouseDown={(e) => {
                  e.preventDefault();
                  closePalette();
                  inputRef.current?.blur();
                }}
              />
              <motion.div
                id="command-palette-header-results"
                role="listbox"
                aria-label="Résultats"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="fixed left-2 right-2 z-[70] sm:left-1/2 sm:right-auto sm:w-[min(100vw-2rem,28rem)] sm:-translate-x-1/2"
                style={{ top: HEADER_DROPDOWN_TOP }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="mt-1.5 overflow-hidden rounded-2xl border border-white/15 bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.65)] ring-1 ring-black/35">
                  {renderResultsList("")}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

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
              className="fixed inset-0 z-[100] bg-void/92 backdrop-blur-md"
              onClick={closePalette}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-label="Navigation rapide"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-[min(18vh,8rem)] -translate-x-1/2 w-[min(100%-1.5rem,28rem)] z-[101] isolate"
            >
              <div className="rounded-2xl border border-white/15 bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.72)] ring-1 ring-black/40 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10 bg-surface2">
                  <span className="shrink-0 text-text-muted" aria-hidden>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelected(0);
                    }}
                    placeholder="Aller à une page…"
                    className="flex-1 min-w-0 rounded-lg border border-white/12 bg-void px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/30"
                    autoFocus
                  />
                  <kbd className="shrink-0 rounded border border-white/15 bg-void px-1.5 py-0.5 font-sans text-[10px] text-text-dim">
                    Esc
                  </kbd>
                </div>
                {renderResultsList("")}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
