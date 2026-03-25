"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { fetchBackend } from "@/lib/api";
import { buildAssistantPromptUrl } from "@/lib/assistant-intents";

type Database = { id: string; title: string; url?: string; lastEdited?: string };
type Page = { id: string; title: string; url?: string; lastEdited?: string };

type Props = { hasNotion: boolean };

export default function NotionView({ hasNotion: initialHasNotion }: Props) {
  const searchParams = useSearchParams();
  const [hasNotion, setHasNotion] = useState(initialHasNotion);
  const [connectionSource, setConnectionSource] = useState<"oauth" | "server-token" | "none">(
    "none"
  );
  const [canDisconnect, setCanDisconnect] = useState(initialHasNotion);
  const [callbackMessage, setCallbackMessage] = useState<"success" | "error" | null>(null);
  const [callbackErrorText, setCallbackErrorText] = useState<string | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(!!initialHasNotion);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDb, setSelectedDb] = useState<Database | null>(null);
  const [dbPages, setDbPages] = useState<Page[]>([]);
  const [dbPagesLoading, setDbPagesLoading] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"oauth" | "server-token" | "none">("none");

  useEffect(() => {
    setHasNotion(initialHasNotion);
    setConnectionSource("none");
    setCanDisconnect(initialHasNotion);
  }, [initialHasNotion]);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        // Backend Nest expose /api/notion/status. Fallback conservé pour compatibilité.
        let response = await fetchBackend("/api/notion/status");
        if (!response.ok) {
          response = await fetchBackend("/api/auth/notion/status");
        }
        const data = await response.json();
        const mode =
          (data.selectedMode as "oauth" | "server-token" | "none" | undefined) ??
          ((data.source as "oauth" | "server-token" | "none" | undefined) ?? "none");
        setSelectedMode(mode);
        if (typeof data.connected === "boolean") {
          setHasNotion(data.connected);
          setConnectionSource((data.source as "oauth" | "server-token" | "none") ?? "none");
          setCanDisconnect(Boolean(data.canDisconnect));
        }
      } catch {
        // no-op
      } finally {
        setStatusChecked(true);
      }
    };
    void loadStatus();
  }, []);

  useEffect(() => {
    const notion = searchParams.get("notion");
    const message = searchParams.get("message");
    if (notion === "success") {
      setCallbackMessage("success");
      setHasNotion(true);
      setConnectionSource("oauth");
      setCanDisconnect(true);
      window.history.replaceState({}, "", "/app/notion");
    } else if (notion === "error" && message) {
      setCallbackMessage("error");
      setCallbackErrorText(decodeURIComponent(message));
      window.history.replaceState({}, "", "/app/notion");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!hasNotion) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchBackend("/api/notion/search")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDatabases(data.databases ?? []);
        setPages(data.pages ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [hasNotion]);

  useEffect(() => {
    if (!selectedDb) {
      setDbPages([]);
      return;
    }
    setDbPagesLoading(true);
    fetchBackend(`/api/notion/databases/${selectedDb.id}/query?pageSize=20`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setDbPages(Array.isArray(data) ? data : (data?.results ?? []));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setDbPagesLoading(false));
  }, [selectedDb]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const r = await fetchBackend("/api/auth/notion/redirect");
      const data = await r.json();
      if (!r.ok || !data.redirectUrl) {
        setError(data?.error ?? "Impossible de lancer la connexion Notion.");
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("Impossible de lancer la connexion Notion.");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    const r = await fetchBackend("/api/auth/notion/disconnect", { method: "POST" });
    if (r.ok) {
      setHasNotion(false);
      setConnectionSource("none");
      setCanDisconnect(false);
      setDatabases([]);
      setPages([]);
      setSelectedDb(null);
      setDbPages([]);
    }
    setLoading(false);
  }

  if (!hasNotion) {
    if (!statusChecked) {
      return (
        <motion.div
          className="glass-strong rounded-xl border border-white/10 p-6 max-w-lg card-glow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-text-primary font-semibold mb-2">Vérification de Notion</p>
          <p className="text-text-muted text-sm">Détection du mode de connexion en cours…</p>
        </motion.div>
      );
    }
    if (selectedMode === "server-token") {
      return (
        <motion.div
          className="glass-strong rounded-xl border border-accent-cyan/30 p-6 max-w-lg card-glow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-text-primary font-semibold mb-2">Mode token serveur détecté</p>
          <p className="text-text-muted text-sm mb-4">
            Notion est en mode token serveur. Vérifiez la variable serveur
            <span className="mx-1 font-mono text-[12px] text-text-primary">NOTION_MCP_TOKEN</span>
            (ou
            <span className="mx-1 font-mono text-[12px] text-text-primary">NOTION_API_KEY</span>)
            puis réessayez.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-accent-violet text-white font-medium hover:opacity-90 transition-opacity"
          >
            Réessayer
          </button>
          {error && <p className="text-accent-rose text-sm mt-3">{error}</p>}
        </motion.div>
      );
    }
    return (
      <motion.div
        className="glass-strong rounded-xl border border-white/10 p-6 max-w-lg card-glow"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-text-primary font-semibold mb-2">Connecter Notion</p>
        <p className="text-text-muted text-sm mb-6">
          Connectez votre workspace Notion via OAuth pour accéder à vos bases et pages.
        </p>
        <button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          className="px-4 py-2 rounded-lg bg-accent-violet text-white font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {connecting ? "Redirection…" : "Se connecter à Notion"}
        </button>
        {error && <p className="text-accent-rose text-sm mt-3">{error}</p>}
      </motion.div>
    );
  }

  if (loading) {
    return (
      <motion.div
        className="glass-strong rounded-xl border border-white/10 p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-3 text-text-muted">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full bg-accent-violet"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          Recherche Notion…
        </div>
      </motion.div>
    );
  }

  if (error && !loading && databases.length === 0 && pages.length === 0) {
    const tokenIssue =
      typeof error === "string" &&
      (error.includes("invalid_token") ||
        error.includes("Invalid token") ||
        error.includes("invalid token"));
    return (
      <motion.div
        className="glass-strong rounded-xl border border-accent-rose/30 p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-accent-rose font-medium">Notion non disponible</p>
        {tokenIssue ? (
          <p className="mt-3 text-sm text-text-primary leading-relaxed">
            Connecte ton workspace Notion avec le bouton « Se connecter à Notion » : le service officiel attend une
            connexion à ton compte, pas seulement une clé d’intégration dans la configuration.
          </p>
        ) : null}
        <p className={`text-text-muted text-sm mt-2 ${tokenIssue ? "text-xs opacity-80" : ""}`}>{error}</p>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={!canDisconnect}
          className="mt-4 text-sm text-text-muted hover:text-text-primary underline"
        >
          {canDisconnect ? "Déconnecter Notion et réessayer" : "Réessayer"}
        </button>
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
          href={buildAssistantPromptUrl(
            selectedDb
              ? `Explique-moi a quoi sert la base Notion ${selectedDb.title} et ce que je devrais en retenir.`
              : "Cherche dans Notion les pages et bases les plus utiles pour m'aider aujourd'hui."
          )}
          className="px-3 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-text-muted hover:text-text-primary hover:border-accent-violet/30 hover:bg-accent-violet/10 transition-colors"
        >
          Explorer avec l'IA
        </Link>
        {selectedDb ? (
          <Link
            href={buildAssistantPromptUrl(`Resume-moi la base Notion ${selectedDb.title} et dis-moi quelles informations meritent mon attention.`)}
            className="px-3 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-text-muted hover:text-text-primary hover:border-accent-violet/30 hover:bg-accent-violet/10 transition-colors"
          >
            Resumer cette base
          </Link>
        ) : null}
      </div>
      {callbackMessage === "success" && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-accent-cyan text-sm"
        >
          Notion connecté avec succès.
        </motion.p>
      )}
      {callbackMessage === "error" && callbackErrorText && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-accent-rose text-sm"
        >
          {callbackErrorText}
        </motion.p>
      )}
      <div className="shrink-0 flex items-center justify-between">
        <span className="text-text-muted text-sm">
          Compte Notion connecté
          {connectionSource === "server-token" ? (
            <span className="ml-2 text-[10px] uppercase tracking-wide text-accent-cyan">Token serveur</span>
          ) : null}
        </span>
        {canDisconnect ? (
          <button
            type="button"
            onClick={handleDisconnect}
            className="text-sm text-text-muted hover:text-accent-rose transition-colors"
          >
            Déconnecter Notion
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Bases de données */}
        <div className="glass-strong rounded-xl border border-white/10 overflow-hidden card-glow flex flex-col min-h-0">
          <div className="p-3 border-b border-white/10 shrink-0">
            <h2 className="font-semibold text-text-primary text-sm">Bases de données</h2>
            <p className="text-xs text-text-muted mt-0.5">Cliquez pour voir le contenu</p>
          </div>
          <ul className="divide-y divide-white/5 flex-1 min-h-0 overflow-y-auto">
            {databases.length === 0 && !loading ? (
              <li className="px-3 py-4 text-text-muted text-sm">Aucune base partagée avec Notion.</li>
            ) : null}
            {databases.map((db, i) => (
              <motion.li
                key={db.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedDb(db)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between ${
                    selectedDb?.id === db.id
                      ? "bg-accent-violet/15 text-accent-violet border-l-2 border-accent-violet"
                      : "text-text-muted hover:bg-white/5 hover:text-text-primary"
                  }`}
                >
                  <span className="truncate">{db.title}</span>
                  {db.url && (
                    <a
                      href={db.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-text-dim hover:text-accent-cyan ml-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ↗
                    </a>
                  )}
                </button>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Pages (racine) */}
        <div className="glass-strong rounded-xl border border-white/10 overflow-hidden card-glow flex flex-col min-h-0">
          <div className="p-3 border-b border-white/10 shrink-0">
            <h2 className="font-semibold text-text-primary text-sm">Pages</h2>
            <p className="text-xs text-text-muted mt-0.5">Ouvrir dans Notion</p>
          </div>
          <ul className="divide-y divide-white/5 flex-1 min-h-0 overflow-y-auto">
            {pages.length === 0 && !loading ? (
              <li className="px-3 py-4 text-text-muted text-sm">Aucune page.</li>
            ) : null}
            {pages.slice(0, 50).map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <a
                  href={p.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2.5 text-sm text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
                >
                  <span className="truncate">{p.title}</span>
                  <span className="text-text-dim">↗</span>
                </a>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Contenu de la base sélectionnée */}
        <div className="glass-strong rounded-xl border border-white/10 overflow-hidden card-glow flex flex-col min-h-0">
          <div className="p-3 border-b border-white/10 shrink-0">
            <h2 className="font-semibold text-text-primary text-sm">Contenu de la base</h2>
            {selectedDb && <p className="text-xs text-text-muted mt-0.5 truncate">{selectedDb.title}</p>}
          </div>
          {dbPagesLoading ? (
            <div className="p-4 text-text-muted text-sm">Chargement…</div>
          ) : !selectedDb ? (
            <div className="p-4 text-text-muted text-sm">Sélectionnez une base pour afficher ses pages (lignes).</div>
          ) : dbPages.length === 0 ? (
            <div className="p-4 text-text-muted text-sm">Aucune page dans cette base.</div>
          ) : (
            <ul className="divide-y divide-white/5 flex-1 min-h-0 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {dbPages.map((p, i) => (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <a
                      href={p.url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2.5 text-sm text-text-muted hover:bg-white/5 hover:text-accent-cyan transition-colors"
                    >
                      <span className="truncate">{p.title}</span>
                      <span className="text-text-dim">↗</span>
                    </a>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
}
