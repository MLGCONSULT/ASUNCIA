"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchBackend } from "@/lib/api";
import { buildAssistantPromptUrl } from "@/lib/assistant-intents";

type GmailMessage = {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  subject?: string;
  from?: string;
};

type MessageDetail = {
  id?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  body?: string;
  snippet?: string;
  textPlain?: string;
  textHtml?: string;
  [key: string]: unknown;
};

type Props = { hasGmail: boolean };

export default function MailsView({ hasGmail: initialHasGmail }: Props) {
  const [hasGmail, setHasGmail] = useState(initialHasGmail);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [messageDetail, setMessageDetail] = useState<MessageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    setHasGmail(initialHasGmail);
  }, [initialHasGmail]);

  const loadMessages = useCallback(() => {
    if (!hasGmail) return;
    setLoading(true);
    setError(null);
    const qs = query.trim() ? `&q=${encodeURIComponent(query.trim())}` : "";
    fetchBackend(`/api/gmail/messages?maxResults=30${qs}`)
      .then((r) => {
        if (!r.ok) throw new Error("Impossible de charger les emails.");
        return r.json();
      })
      .then((data) => setMessages(data.messages ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [hasGmail, query]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/gmail");
      const data = await r.json();
      if (!r.ok || !data.url) {
        setError("Configuration Gmail manquante.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Impossible de lancer la connexion.");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    const r = await fetchBackend("/api/gmail/disconnect", { method: "POST" });
    if (r.ok) {
      setHasGmail(false);
      setMessages([]);
      window.location.reload();
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!selectedMessageId) {
      setMessageDetail(null);
      return;
    }
    setDetailLoading(true);
    fetchBackend(`/api/gmail/messages/${encodeURIComponent(selectedMessageId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Impossible de charger le message.");
        return r.json();
      })
      .then(setMessageDetail)
      .catch(() => setMessageDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedMessageId]);

  async function handleSendEmail(to: string, subject: string, body: string) {
    setSendLoading(true);
    setSendError(null);
    try {
      const r = await fetchBackend("/api/gmail/send", {
        method: "POST",
        body: JSON.stringify({ to, subject, body }),
      });
      const data = await r.json();
      if (!r.ok) {
        setSendError((data.error as string) || "Erreur lors de l'envoi.");
        return;
      }
      setComposeOpen(false);
      loadMessages();
    } catch {
      setSendError("Erreur réseau.");
    } finally {
      setSendLoading(false);
    }
  }

  if (!hasGmail) {
    return (
      <motion.div
        className="glass-strong rounded-2xl border border-white/10 p-8 max-w-lg card-glow"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-text-primary font-semibold mb-2">Connecter Gmail</p>
        <p className="text-text-muted text-sm mb-6">
          Lie ta boîte Google ici pour que je puisse afficher tes emails et en parler avec toi.
        </p>
        <button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          className="px-5 py-2.5 rounded-lg font-medium btn-neon disabled:opacity-50"
        >
          {connecting ? "Redirection…" : "Se connecter à Gmail"}
        </button>
        {error && (
          <p className="mt-4 text-sm text-accent-rose">{error}</p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col flex-1 min-h-0 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-wrap gap-2 shrink-0">
        <Link
          href={buildAssistantPromptUrl("Resume mes derniers mails importants et dis-moi ce que je dois traiter en premier.")}
          className="px-3 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-text-muted hover:text-text-primary hover:border-accent-cyan/30 hover:bg-accent-cyan/10 transition-colors"
        >
          Resumer mes mails
        </Link>
        <Link
          href={buildAssistantPromptUrl("Analyse mes derniers mails et propose-moi des reponses courtes et prioritaires.")}
          className="px-3 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-text-muted hover:text-text-primary hover:border-accent-cyan/30 hover:bg-accent-cyan/10 transition-colors"
        >
          Proposer des reponses
        </Link>
      </div>
      <div className="shrink-0 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Rechercher dans les mails…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadMessages()}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent-cyan/50"
        />
        <button
          type="button"
          onClick={() => loadMessages()}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-white/10 text-text-primary text-sm font-medium hover:bg-white/15 disabled:opacity-50"
        >
          Rechercher
        </button>
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="px-3 py-2 rounded-lg btn-neon text-sm font-medium"
        >
          Nouveau message
        </button>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={loading}
          className="text-sm text-text-muted hover:text-accent-rose transition-colors disabled:opacity-50"
        >
          Déconnecter Gmail
        </button>
      </div>
      <div className="glass-strong rounded-xl border border-white/10 overflow-hidden card-glow flex-1 min-h-0 flex flex-col">
        {loading && messages.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            Chargement des emails…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-sm">{error}</div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            Aucun email à afficher.
          </div>
        ) : (
          <ul className="divide-y divide-white/10 flex-1 min-h-0 overflow-auto">
            {messages.map((m, i) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMessageId(m.id)}
                onKeyDown={(e) => e.key === "Enter" && setSelectedMessageId(m.id)}
                className="p-3 py-2.5 hover:bg-white/[0.05] transition-colors rounded-lg cursor-pointer"
              >
                <p className="font-medium text-text-primary truncate">
                  {m.subject || "(Sans objet)"}
                </p>
                <p className="text-sm text-text-muted truncate mt-0.5">
                  {m.from}
                </p>
                {m.snippet && (
                  <p className="text-sm text-text-muted mt-1 line-clamp-2">
                    {m.snippet}
                  </p>
                )}
                {m.internalDate && (
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(Number(m.internalDate)).toLocaleDateString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* Drawer lecture message */}
      <AnimatePresence>
        {selectedMessageId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60"
            onClick={() => setSelectedMessageId(null)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="w-full max-w-lg bg-background border-l border-white/10 shadow-xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-text-primary">Message</h3>
                <button
                  type="button"
                  onClick={() => setSelectedMessageId(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-text-muted"
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {detailLoading ? (
                  <p className="text-text-muted text-sm">Chargement…</p>
                ) : messageDetail ? (
                  <div className="space-y-3 text-sm">
                    <p><span className="text-text-muted">De :</span> {messageDetail.from ?? "—"}</p>
                    <p><span className="text-text-muted">À :</span> {messageDetail.to ?? "—"}</p>
                    <p><span className="text-text-muted">Objet :</span> {messageDetail.subject ?? "(Sans objet)"}</p>
                    {messageDetail.date && (
                      <p><span className="text-text-muted">Date :</span> {new Date(messageDetail.date as string).toLocaleString("fr-FR")}</p>
                    )}
                    <div className="mt-4 pt-3 border-t border-white/10">
                      {(messageDetail.textPlain ?? messageDetail.body ?? messageDetail.snippet) ? (
                        <pre className="whitespace-pre-wrap font-sans text-text-primary">
                          {String(messageDetail.textPlain ?? messageDetail.body ?? messageDetail.snippet)}
                        </pre>
                      ) : (
                        <p className="text-text-muted">Aucun contenu texte.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-accent-rose text-sm">Impossible de charger ce message.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal nouveau message */}
      <AnimatePresence>
        {composeOpen && (
          <ComposeModal
            onClose={() => { setComposeOpen(false); setSendError(null); }}
            onSend={handleSendEmail}
            loading={sendLoading}
            error={sendError}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ComposeModal({
  onClose,
  onSend,
  loading,
  error,
}: {
  onClose: () => void;
  onSend: (to: string, subject: string, body: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md glass-strong rounded-2xl border border-white/10 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-text-primary mb-4">Nouveau message</h3>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (to.trim()) onSend(to.trim(), subject, body);
          }}
        >
          <div>
            <label className="block text-xs text-text-muted mb-1">Destinataire</label>
            <input
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm"
              placeholder="email@exemple.fr"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Objet</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm"
              placeholder="Objet"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm resize-y"
              placeholder="Votre message…"
            />
          </div>
          {error && <p className="text-sm text-accent-rose">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 text-text-primary text-sm">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg btn-neon text-sm disabled:opacity-50">
              {loading ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
