"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const processedPromptRef = useRef<string | null>(null);

  const fetchConversations = useCallback(async () => {
    const res = await fetchBackend("/api/chat/conversations");
    if (!res.ok) return;
    const data = (await res.json()) as { conversations?: ConversationItem[] };
    if (Array.isArray(data.conversations)) setConversations(data.conversations);
  }, []);

  const loadConversation = useCallback(
    async (id: string | null) => {
      if (id === null) {
        setConversationId(null);
        setMessages([]);
        return;
      }
      const res = await fetchBackend(`/api/chat/conversation?conversationId=${encodeURIComponent(id)}`);
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
          : []
      );
    },
    []
  );

  useEffect(() => {
    (async () => {
      try {
        await fetchConversations();
        const res = await fetchBackend("/api/chat/conversation");
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
            }))
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
      if (!texte.trim() || loading) return;
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
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          conversationId: conversationId ?? undefined,
          createNew: conversationId === null,
          stream: true,
        }),
      });

      if (res.status === 401) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: "Ta session a expiré. Reconnecte-toi et on reprendra." } : m
          )
        );
        setLoading(false);
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";
      const isStream = contentType.includes("ndjson") && res.body != null;

      if (isStream) {
        const reader = res.body.getReader();
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
                  prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m))
                );
              } else if (data.type === "done") {
                if (typeof data.content === "string") fullContent = data.content;
                if (data.conversationId && !conversationId) {
                  setConversationId(data.conversationId);
                  fetchConversations();
                }
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m))
                );
              } else if (data.type === "error" && data.error) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: `Erreur : ${data.error}` } : m))
                );
              }
            } catch {
              // ignore malformed line
            }
          }
        }
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer.trim()) as { type?: string; content?: string; conversationId?: string };
            if (data.type === "done" && typeof data.content === "string") {
              if (data.conversationId && !conversationId) {
                setConversationId(data.conversationId);
                fetchConversations();
              }
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: data.content! } : m))
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
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
          fetchConversations();
        }
        const content =
          data.reply ||
          (res.ok ? "" : data.error || "Une petite erreur s'est glissée. Réessaie dans un instant.");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: content || "Bienvenue. Dis-moi ce que tu souhaites faire." }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "La connexion a échoué. Réessaie quand tu veux." } : m
        )
      );
    } finally {
      setLoading(false);
    }
    },
    [conversationId, fetchConversations, loading, messages]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitPrompt(input.trim());
  }

  useEffect(() => {
    const prompt = searchParams.get("prompt")?.trim();
    if (!prompt || !historyLoaded || loading) return;
    if (processedPromptRef.current === prompt) return;
    processedPromptRef.current = prompt;
    submitPrompt(prompt);
    window.history.replaceState({}, "", "/app/dashboard");
  }, [historyLoaded, loading, searchParams, submitPrompt]);

  return (
    <motion.div
      className={`flex min-h-0 h-full glass-strong border border-white/10 overflow-hidden ${
        compact ? "rounded-[1.9rem]" : "flex-1 rounded-xl"
      }`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <aside className={`w-48 shrink-0 border-r border-white/10 flex-col bg-surface/30 ${compact ? "hidden" : "hidden sm:flex"}`}>
        <div className="p-2 border-b border-white/10">
          <button
            type="button"
            onClick={() => loadConversation(null)}
            className="w-full py-2 px-2.5 rounded-lg text-sm font-medium bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 hover:bg-accent-cyan/25 transition-colors"
          >
            Nouvelle conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => loadConversation(c.id)}
              className={`w-full rounded-lg px-2.5 py-2 text-left text-sm leading-5 whitespace-normal break-words transition-colors ${
                conversationId === c.id
                  ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                  : "text-text-muted hover:bg-white/5 hover:text-text-primary border border-transparent"
              }`}
              title={c.titre}
            >
              {c.titre || "Sans titre"}
            </button>
          ))}
        </div>
      </aside>
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className={`${compact ? "hidden" : "sm:hidden"} p-2 border-b border-white/10`}>
          <button
            type="button"
            onClick={() => loadConversation(null)}
            className="text-sm text-accent-cyan hover:underline"
          >
            Nouvelle conversation
          </button>
        </div>
      <div className={`flex-1 overflow-y-auto ${compact ? "p-3" : "p-4"} space-y-3`}>
        <AnimatePresence initial={false}>
          {!historyLoaded && (
            <motion.div
              className="text-center py-12 text-text-muted text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Chargement de l'historique…
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
                <div className={`${compact ? "h-12 w-12" : "h-16 w-16"} rounded-full border border-accent-cyan/30 overflow-hidden bg-surface2 flex items-center justify-center shrink-0`}>
                  <Image src="/logo.png" alt="" width={compact ? 40 : 56} height={compact ? 24 : 34} className="object-contain" />
                </div>
              </div>
              <p className="font-display font-semibold text-text-primary mb-2">
                {compact ? "Assistant IA" : "Je suis là pour toi"}
              </p>
              <p className={`lava-text-safe text-text-muted text-sm ${compact ? "max-w-xs" : "max-w-md"} mx-auto`}>
                {compact
                  ? "Demande une synthèse, une priorisation ou une action."
                  : "Dis-moi simplement ce que tu veux faire : ajouter un contact, voir tes derniers mails, lancer une automatisation…"}
              </p>
              <div className={`mt-5 flex flex-wrap justify-center gap-2 ${compact ? "max-w-sm" : "max-w-2xl"} mx-auto`}>
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
                <p className="lava-text-safe text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div
              className="flex justify-start gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-10 h-10 rounded-full border border-accent-cyan/30 overflow-hidden bg-surface2 flex items-center justify-center shrink-0">
                <Image src="/logo.png" alt="" width={32} height={20} className="object-contain" />
              </div>
              <div className="glass rounded-xl px-4 py-3 border border-white/10 flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 rounded-full bg-accent-cyan/70"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
                <span className="text-text-muted text-sm">J'y réfléchis…</span>
              </div>
            </motion.div>
          )}
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
            placeholder="Dis-moi ce que tu veux faire…"
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
