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

type ConversationItem = {
  id: string;
  titre: string;
  dateCreation: string;
  dateMiseAJour: string;
};

function buildHistoryPayload(messagesBeforeTurn: Message[]): { role: string; content: string }[] {
  return messagesBeforeTurn
    .filter(
      (m) =>
        m.role === "user" || (m.role === "assistant" && m.content.trim().length > 0),
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

function formatConversationDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
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
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [conversationsError, setConversationsError] = useState(false);
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

  const fetchConversations = useCallback(async () => {
    const res = await fetchBackend("/api/conversations");
    if (!res.ok) {
      setConversationsError(true);
      return;
    }
    setConversationsError(false);
    const data = (await res.json()) as { conversations?: ConversationItem[] };
    if (Array.isArray(data.conversations)) setConversations(data.conversations);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const res = await fetchBackend(
      `/api/conversation?conversationId=${encodeURIComponent(id)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      conversationId?: string;
      messages?: { id: string; role: "user" | "assistant"; content: string; date: string }[];
    };
    if (data.conversationId) setConversationId(data.conversationId);
    setMessages(
      Array.isArray(data.messages)
        ? data.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            date: new Date(m.date),
          }))
        : [],
    );
  }, []);

  const startNewConversation = useCallback(async () => {
    const res = await fetchBackend("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre: "Nouvelle conversation" }),
    });
    if (!res.ok) {
      setConversationsError(true);
      return;
    }
    setConversationsError(false);
    const data = (await res.json()) as { conversationId?: string | null };
    if (data.conversationId) {
      setConversationId(data.conversationId);
      setMessages([]);
      await fetchConversations();
    }
  }, [fetchConversations]);

  useEffect(() => {
    (async () => {
      try {
        await fetchConversations();
        const res = await fetchBackend("/api/conversation");
        if (!res.ok) return;
        const data = (await res.json()) as {
          conversationId?: string;
          messages?: { id: string; role: "user" | "assistant"; content: string; date: string }[];
        };
        if (data.conversationId) setConversationId(data.conversationId);
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(
            data.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              date: new Date(m.date),
            })),
          );
        }
      } finally {
        setHistoryLoaded(true);
      }
    })();
  }, [fetchConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submitPrompt = useCallback(
    async (texte: string) => {
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
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", date: new Date() },
      ]);

      try {
        const res = await fetchBackend("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: texte,
            history: historyPayload,
            conversationId: cid ?? undefined,
            createNew: cid === null,
            stream: true,
          }),
        });

        if (res.status === 401) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Ta session a expiré. Reconnecte-toi pour reprendre." }
                : m,
            ),
          );
          setLoading(false);
          return;
        }

        const contentType = res.headers.get("content-type") ?? "";
        const isStream = contentType.includes("ndjson") && res.body != null;

        const applyConversationId = (nextId: string | undefined) => {
          if (!nextId) return;
          setConversationId((prev) => prev ?? nextId);
          fetchConversations();
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
    },
    [fetchConversations],
  );

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

  const showConversationToolbar = compact ? "flex" : "flex sm:hidden";

  const conversationToolbar = (
    <div
      className={`${showConversationToolbar} shrink-0 items-stretch gap-2 border-b border-white/10 bg-gradient-to-r from-surface/80 via-surface/50 to-surface/80 px-2 py-2.5 sm:px-3`}
    >
      <div className="relative min-w-0 flex-1 flex items-center rounded-xl border border-white/12 bg-black/25 pl-3 pr-8 shadow-inner shadow-black/20">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" aria-hidden>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </span>
        <label className="sr-only" htmlFor="assistant-conversation-select">
          Conversation active
        </label>
        <select
          id="assistant-conversation-select"
          className="w-full appearance-none rounded-xl border-0 bg-transparent py-2 pl-8 pr-2 text-xs font-medium text-text-primary outline-none focus:ring-0 cursor-pointer"
          value={conversationId ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v) void loadConversation(v);
          }}
        >
          {conversations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.titre || "Sans titre"}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim" aria-hidden>
          <svg className="h-3.5 w-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      <button
        type="button"
        onClick={() => void startNewConversation()}
        className="shrink-0 rounded-xl border border-accent-cyan/40 bg-accent-cyan/15 px-3 py-2 text-xs font-semibold text-accent-cyan shadow-[0_0_20px_-8px_rgba(34,211,238,0.5)] hover:bg-accent-cyan/25 active:scale-[0.98] transition-all"
      >
        + Nouveau
      </button>
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
      <aside
        className={`w-[13.5rem] shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-surface/40 to-surface/20 ${
          compact ? "hidden" : "hidden sm:flex"
        }`}
      >
        <div className="p-3 border-b border-white/10">
          <button
            type="button"
            onClick={() => void startNewConversation()}
            className="group w-full rounded-xl border border-accent-cyan/35 bg-accent-cyan/10 py-2.5 px-3 text-left transition-all hover:bg-accent-cyan/20 hover:border-accent-cyan/50"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-accent-cyan">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-cyan/20 text-lg leading-none">
                +
              </span>
              Nouvelle conversation
            </span>
            <span className="mt-1 block text-[10px] text-text-muted group-hover:text-text-muted/90">
              Démarrer un fil vierge
            </span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-1.5 [scrollbar-width:thin]">
          <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-dim">
            Historique
          </p>
          {conversationsError && (
            <p className="text-[11px] text-accent-rose/90 px-1 rounded-lg bg-accent-rose/10 border border-accent-rose/20 py-2">
              Liste indisponible pour le moment.
            </p>
          )}
          {conversations.map((c) => {
            const active = conversationId === c.id;
            const sub = formatConversationDate(c.dateMiseAJour || c.dateCreation);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => void loadConversation(c.id)}
                className={`group w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
                  active
                    ? "border-accent-cyan/45 bg-accent-cyan/15 shadow-[0_0_24px_-12px_rgba(34,211,238,0.55)]"
                    : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]"
                }`}
                title={c.titre}
              >
                <span
                  className={`line-clamp-2 text-sm font-medium leading-snug ${
                    active ? "text-accent-cyan" : "text-text-primary group-hover:text-text-primary"
                  }`}
                >
                  {c.titre || "Sans titre"}
                </span>
                {sub ? (
                  <span className="mt-1 block text-[10px] text-text-dim">{sub}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {conversationToolbar}
        <div className={`flex-1 overflow-y-auto ${compact ? "p-3" : "p-4"} space-y-3`}>
          <AnimatePresence initial={false}>
            {!historyLoaded && (
              <motion.div
                className="text-center py-12 text-text-muted text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Chargement de l’historique…
              </motion.div>
            )}
            {historyLoaded && messages.length === 0 && (
              <motion.div
                className={`text-center ${compact ? "py-8" : "py-16"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
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
                    ? "Une question sur Airtable, Notion, n8n ou tes données : décris ce que tu veux obtenir."
                    : "Je peux t’orienter vers le bon outil : bases Airtable, pages Notion, automatisations n8n, ou exploration de données. Dis-moi ton objectif."}
                </p>
                <div
                  className={`mt-5 flex flex-wrap justify-center gap-2 ${compact ? "max-w-sm" : "max-w-2xl"} mx-auto`}
                >
                  {dashboardIntents.map((intent) => (
                    <button
                      key={intent.id}
                      type="button"
                      onClick={() => submitPrompt(intent.prompt)}
                      className="lava-text-safe px-3 py-2 rounded-full border border-white/10 bg-white/5 text-center text-xs leading-4 text-text-muted hover:text-text-primary hover:border-accent-cyan/30 hover:bg-accent-cyan/10 transition-colors"
                      title={intent.description}
                    >
                      {intent.title}
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 rounded-full bg-accent-cyan/60"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            {messages.map((m, i) => (
              <motion.div
                key={m.id}
                className={`flex gap-3 ${m.role === "user" ? "justify-end flex-row-reverse" : "justify-start"}`}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: i === messages.length - 1 ? 0.1 : 0 }}
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
