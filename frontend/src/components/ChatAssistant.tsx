"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { fetchBackend } from "@/lib/api";
import { dashboardIntents } from "@/lib/assistant-intents";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  date: Date;
};

function buildHistoryPayload(messagesBeforeTurn: Message[]): { role: string; content: string }[] {
  return messagesBeforeTurn
    .filter(
      (m) =>
        m.role === "user" || (m.role === "assistant" && m.content.trim().length > 0),
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

function renderMessageWithLinks(content: string): React.ReactNode {
  const regex = /(https?:\/\/[^\s]+|\/app\/[a-zA-Z0-9/_-]+)/g;
  const parts = content.split(regex);
  return parts.map((part, index) => {
    const isInternal = /^\/app\/[a-zA-Z0-9/_-]+$/.test(part);
    const isExternal = /^https?:\/\/[^\s]+$/.test(part);
    if (isInternal) {
      return (
        <Link key={`${part}-${index}`} href={part} className="underline decoration-accent-cyan/50 hover:text-accent-cyan">
          {part}
        </Link>
      );
    }
    if (isExternal) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-accent-cyan/50 hover:text-accent-cyan"
        >
          {part}
        </a>
      );
    }
    return <span key={`${index}-${part.slice(0, 8)}`}>{part}</span>;
  });
}

export default function ChatAssistant({
  compact = false,
}: {
  compact?: boolean;
}) {
  const searchParams = useSearchParams();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoadError, setHistoryLoadError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const processedPromptRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const conversationIdRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), 12_000);

    (async () => {
      try {
        // Route canonique côté backend: /api/chat/conversation
        // Fallback conservé pour compatibilité (anciens déploiements/proxys).
        let res = await fetchBackend("/api/chat/conversation", { signal: ac.signal });
        if (!res.ok && res.status === 404) {
          res = await fetchBackend("/api/conversation", { signal: ac.signal });
        }
        if (cancelled) return;
        if (!res.ok) {
          setHistoryLoadError(true);
          return;
        }
        setHistoryLoadError(false);
        const data = (await res.json()) as {
          conversationId?: string;
          messages?: { id: string; role: "user" | "assistant"; content: string; date: string }[];
        };
        if (data.conversationId) setConversationId(data.conversationId);
        if (Array.isArray(data.messages)) {
          setMessages(
            data.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content ?? "",
              date: new Date(m.date || Date.now()),
            })),
          );
        }
      } catch (e) {
        if (cancelled) return;
        const aborted = e instanceof Error && e.name === "AbortError";
        setHistoryLoadError(true);
        if (aborted) {
          console.warn("[ChatAssistant] Chargement historique : délai dépassé ou annulé");
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setHistoryLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submitPrompt = useCallback(async (texte: string) => {
    if (!texte.trim() || loadingRef.current) return;

    const priorForHistory = messagesRef.current;
    const historyPayload = buildHistoryPayload(priorForHistory);
    const cid = conversationIdRef.current;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: texte,
      date: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", date: new Date() }]);

    try {
      const res = await fetchBackend("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: texte,
          history: historyPayload,
          conversationId: cid ?? undefined,
          createNew: false,
          stream: true,
        }),
      });

      if (res.status === 401) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: "Ta session a expiré. Reconnecte-toi pour reprendre." } : m,
          ),
        );
        setLoading(false);
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";
      const isStream = contentType.includes("ndjson") && res.body != null;

      const applyConversationId = (nextId: string | undefined) => {
        if (!nextId) return;
        setConversationId(nextId);
      };

      if (isStream) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const data = JSON.parse(trimmed) as {
                type?: string;
                content?: string;
                error?: string;
                conversationId?: string;
              };
              if (data.type === "chunk" && typeof data.content === "string") {
                fullContent += data.content;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)),
                );
              } else if (data.type === "done") {
                if (typeof data.content === "string") fullContent = data.content;
                applyConversationId(data.conversationId);
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)),
                );
              } else if (data.type === "error" && data.error) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: `Erreur : ${data.error}` } : m,
                  ),
                );
              }
            } catch {
              // ignore malformed line
            }
          }
        }
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer.trim()) as {
              type?: string;
              content?: string;
              conversationId?: string;
            };
            if (data.type === "done" && typeof data.content === "string") {
              applyConversationId(data.conversationId);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: data.content! } : m)),
              );
            }
          } catch {
            // ignore
          }
        }
      } else {
        const data = (await res.json()) as {
          reply?: string;
          error?: string;
          conversationId?: string;
        };
        applyConversationId(data.conversationId);
        const content =
          data.reply ||
          (res.ok ? "" : data.error || "Une erreur s’est produite. Réessaie dans un instant.");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: content || "Dis-moi ce que tu veux faire avec tes outils." }
              : m,
          ),
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "La connexion a échoué. Réessaie quand tu veux." } : m,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitPrompt(input.trim());
  }

  useEffect(() => {
    const prompt = searchParams.get("prompt")?.trim();
    if (!prompt || !historyLoaded || loadingRef.current) return;
    if (processedPromptRef.current === prompt) return;
    processedPromptRef.current = prompt;
    submitPrompt(prompt);
    window.history.replaceState({}, "", "/app/dashboard");
  }, [historyLoaded, searchParams, submitPrompt]);

  const sessionHeader = (
    <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-surface/90 via-surface/60 to-surface/90 px-2.5 py-2 sm:px-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-dim">Historique</p>
      <p className="text-[11px] text-text-muted mt-0.5">
        Une seule conversation : tes échanges sont conservés pour reprendre le fil.
      </p>
      {historyLoadError ? (
        <p className="text-[11px] text-accent-rose/90 mt-1.5 rounded-lg border border-accent-rose/25 bg-accent-rose/10 px-2 py-1.5">
          Impossible de charger l&apos;historique. Tu peux quand même écrire : une nouvelle session sera créée côté serveur si besoin.
        </p>
      ) : null}
    </div>
  );

  return (
    <motion.div
      className={`flex min-h-0 h-full glass-strong border border-white/10 overflow-hidden ${
        compact ? "rounded-[1.9rem]" : "flex-1 rounded-xl"
      }`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {sessionHeader}
        <div className={`flex-1 overflow-y-auto ${compact ? "p-3" : "p-4"} space-y-3`}>
          <AnimatePresence mode="wait" initial={false}>
            {!historyLoaded && (
              <motion.div
                key="loading"
                className="flex flex-col items-center justify-center gap-3 py-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex w-full max-w-[14rem] flex-col gap-2">
                  <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full w-1/3 rounded-full bg-accent-cyan/35"
                      animate={{ x: ["-100%", "280%"] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <div className="h-2 w-4/5 rounded-full bg-white/[0.05] mx-auto" />
                  <div className="h-2 w-3/5 rounded-full bg-white/[0.04] mx-auto" />
                </div>
                <p className="text-text-muted text-xs">Synchronisation de l’historique…</p>
              </motion.div>
            )}
            {historyLoaded && messages.length === 0 && (
              <motion.div
                key="empty"
                className={`text-center ${compact ? "py-8" : "py-16"}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-4 flex justify-center">
                  <div
                    className={`${compact ? "h-12 w-12" : "h-16 w-16"} rounded-full border border-accent-cyan/30 overflow-hidden bg-surface2 flex items-center justify-center shrink-0`}
                  >
                    <Image
                      src="/logo.png"
                      alt=""
                      width={compact ? 40 : 56}
                      height={compact ? 24 : 34}
                      className="object-contain"
                    />
                  </div>
                </div>
                <p className="font-display font-semibold text-text-primary mb-2">
                  {compact ? "Guide intégré" : "Par où on commence ?"}
                </p>
                <p
                  className={`lava-text-safe text-text-muted text-sm ${compact ? "max-w-xs" : "max-w-md"} mx-auto`}
                >
                  {compact
                    ? "Une question sur Airtable, n8n ou Supabase : décris ce que tu veux obtenir."
                    : "Je peux t’orienter vers le bon outil : bases Airtable, workflows n8n, ou données Supabase. Dis-moi ton objectif."}
                </p>
                <div
                  className={`mt-5 flex flex-wrap justify-center gap-2 ${compact ? "max-w-sm" : "max-w-2xl"} mx-auto`}
                >
                  {dashboardIntents.map((intent) => (
                    <div
                      key={intent.id}
                      className="lava-text-safe px-3 py-2 rounded-full border border-white/10 bg-white/5 text-center text-xs leading-4 text-text-muted cursor-default select-none"
                      title={intent.description}
                    >
                      {intent.title}
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-[11px] text-text-dim/90">Écris en bas pour lancer le guide.</p>
              </motion.div>
            )}
            {historyLoaded &&
              messages.map((m, i) => (
              <motion.div
                key={m.id}
                className={`flex gap-3 ${m.role === "user" ? "justify-end flex-row-reverse" : "justify-start"}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: i === messages.length - 1 ? 0.04 : 0 }}
              >
                {m.role === "assistant" ? (
                  <div className="w-10 h-10 rounded-full border border-accent-cyan/30 overflow-hidden bg-surface2 flex items-center justify-center shrink-0">
                    <Image src="/logo.png" alt="" width={32} height={20} className="object-contain" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent-cyan/20 border border-accent-cyan/30 flex items-center justify-center shrink-0 text-accent-cyan text-xs font-semibold">
                    Vous
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 shadow-sm ${
                    m.role === "user"
                      ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-glow"
                      : "glass text-text-primary border border-white/10"
                  }`}
                >
                  {m.role === "assistant" && loading && m.content === "" ? (
                    <div className="flex items-center gap-2 py-0.5">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((j) => (
                          <motion.span
                            key={j}
                            className="w-2 h-2 rounded-full bg-accent-cyan/70"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 0.55, repeat: Infinity, delay: j * 0.12 }}
                          />
                        ))}
                      </div>
                      <span className="text-text-muted text-sm">Réflexion en cours…</span>
                    </div>
                  ) : (
                    <p className="lava-text-safe text-sm whitespace-pre-wrap break-words">
                      {renderMessageWithLinks(m.content)}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={handleSubmit}
          className={`border-t border-white/10 bg-surface/50 ${compact ? "p-2.5" : "p-3"}`}
        >
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Décris ce que tu veux faire…"
              className={`flex-1 input-neon min-w-0 ${compact ? "py-2" : "py-2.5"}`}
              disabled={loading}
            />
            <motion.button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 rounded-lg text-sm font-medium btn-neon disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Envoyer
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
