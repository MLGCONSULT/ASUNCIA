"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchBackend } from "@/lib/api";
import NavIcon from "@/components/NavIcon";
import { buildAssistantPromptUrl } from "@/lib/assistant-intents";

type Workflow = {
  id: string;
  name?: string | null;
  active?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  triggerCount?: number | null;
  canExecute?: boolean;
};

type WorkflowDetail = {
  id?: string;
  name?: string;
  active?: boolean;
  nodes?: { name?: string; type?: string; parameters?: unknown }[];
  meta?: { instanceId?: string };
  settings?: unknown;
  [key: string]: unknown;
};

export default function N8nView() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"activate" | "deactivate" | "delete" | null>(null);
  const [executeResult, setExecuteResult] = useState<{ id: string; ok: boolean; message?: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkflowDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [executeResultDetail, setExecuteResultDetail] = useState<{ ok: boolean; message?: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchBackend("/api/n8n/workflows?limit=50");
      if (r.status === 503) throw new Error("n8n n'est pas configuré. Vérifiez N8N_MCP_URL et N8N_MCP_ACCESS_TOKEN dans le backend.");
      if (!r.ok) throw new Error("Impossible de charger les workflows.");
      const data = await r.json();
      setWorkflows(Array.isArray(data.workflows) ? data.workflows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setExecuteResultDetail(null);
      return;
    }
    setDetailLoading(true);
    setExecuteResultDetail(null);
    fetchBackend("/api/n8n/workflows/" + encodeURIComponent(selectedId))
      .then((r) => {
        if (!r.ok) throw new Error("Impossible de charger le détail.");
        return r.json();
      })
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const handleExecute = useCallback(async (id: string, chatInput?: string) => {
    setExecutingId(id);
    setExecuteResult(null);
    setExecuteResultDetail(null);
    try {
      const r = await fetchBackend("/api/n8n/workflows/" + encodeURIComponent(id) + "/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: { type: "chat", chatInput: chatInput?.trim() || "Exécution manuelle depuis l'app" },
        }),
      });
      const data = await r.json();
      setExecuteResult({ id, ok: r.ok, message: r.ok ? "Workflow exécuté." : (data.error || "Erreur") });
      setExecuteResultDetail({ ok: r.ok, message: r.ok ? "Workflow exécuté." : (data.error || "Erreur") });
    } catch {
      setExecuteResult({ id, ok: false, message: "Erreur réseau." });
      setExecuteResultDetail({ ok: false, message: "Erreur réseau." });
    } finally {
      setExecutingId(null);
    }
  }, []);

  const handleActivate = useCallback(async (id: string) => {
    setActioningId(id);
    setActionType("activate");
    try {
      const r = await fetchBackend("/api/n8n/workflows/" + encodeURIComponent(id) + "/activate", {
        method: "POST",
      });
      const data = await r.json();
      if (r.ok) {
        await loadWorkflows();
        if (selectedId === id) {
          setDetail((prev) => (prev ? { ...prev, active: true } : null));
        }
        setExecuteResult({ id, ok: true, message: "Workflow activé." });
      } else {
        setExecuteResult({ id, ok: false, message: data.error || "Erreur" });
      }
    } catch {
      setExecuteResult({ id, ok: false, message: "Erreur réseau." });
    } finally {
      setActioningId(null);
      setActionType(null);
    }
  }, [loadWorkflows, selectedId]);

  const handleDeactivate = useCallback(async (id: string) => {
    setActioningId(id);
    setActionType("deactivate");
    try {
      const r = await fetchBackend("/api/n8n/workflows/" + encodeURIComponent(id) + "/deactivate", {
        method: "POST",
      });
      const data = await r.json();
      if (r.ok) {
        await loadWorkflows();
        if (selectedId === id) {
          setDetail((prev) => (prev ? { ...prev, active: false } : null));
        }
        setExecuteResult({ id, ok: true, message: "Workflow désactivé." });
      } else {
        setExecuteResult({ id, ok: false, message: data.error || "Erreur" });
      }
    } catch {
      setExecuteResult({ id, ok: false, message: "Erreur réseau." });
    } finally {
      setActioningId(null);
      setActionType(null);
    }
  }, [loadWorkflows, selectedId]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce workflow ?")) return;
    setActioningId(id);
    setActionType("delete");
    try {
      const r = await fetchBackend("/api/n8n/workflows/" + encodeURIComponent(id), {
        method: "DELETE",
      });
      const data = await r.json();
      if (r.ok) {
        await loadWorkflows();
        if (selectedId === id) {
          setSelectedId(null);
        }
        setExecuteResult({ id, ok: true, message: "Workflow supprimé." });
      } else {
        setExecuteResult({ id, ok: false, message: data.error || "Erreur" });
      }
    } catch {
      setExecuteResult({ id, ok: false, message: "Erreur réseau." });
    } finally {
      setActioningId(null);
      setActionType(null);
    }
  }, [loadWorkflows, selectedId]);

  const handleCreate = useCallback(async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const r = await fetchBackend("/api/n8n/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          nodes: [],
          connections: {},
          settings: {},
        }),
      });
      const data = await r.json();
      if (r.ok) {
        setShowCreateModal(false);
        setCreateName("");
        await loadWorkflows();
        setExecuteResult({ id: "", ok: true, message: "Workflow créé." });
      } else {
        setExecuteResult({ id: "", ok: false, message: data.error || "Erreur" });
      }
    } catch {
      setExecuteResult({ id: "", ok: false, message: "Erreur réseau." });
    } finally {
      setCreating(false);
    }
  }, [createName, loadWorkflows]);

  const handleUpdate = useCallback(async () => {
    if (!selectedId || !editName.trim()) return;
    setEditing(true);
    try {
      const r = await fetchBackend("/api/n8n/workflows/" + encodeURIComponent(selectedId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
        }),
      });
      const data = await r.json();
      if (r.ok) {
        setShowEditModal(false);
        await loadWorkflows();
        setDetail((prev) => (prev ? { ...prev, name: editName.trim() } : null));
        setExecuteResult({ id: selectedId, ok: true, message: "Workflow mis à jour." });
      } else {
        setExecuteResult({ id: selectedId, ok: false, message: data.error || "Erreur" });
      }
    } catch {
      setExecuteResult({ id: selectedId, ok: false, message: "Erreur réseau." });
    } finally {
      setEditing(false);
    }
  }, [selectedId, editName, loadWorkflows]);

  useEffect(() => {
    if (showEditModal && detail) {
      setEditName(detail.name || "");
    }
  }, [showEditModal, detail]);

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
          Chargement des workflows…
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="glass-strong rounded-xl border border-accent-rose/30 p-6 card-glow"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-accent-rose font-semibold">Workflows n8n indisponibles</p>
        <p className="text-text-muted text-sm mt-1">{error}</p>
        <p className="text-text-dim text-xs mt-3">
          Configurez <code className="bg-white/10 px-1 rounded">N8N_MCP_URL</code> et{" "}
          <code className="bg-white/10 px-1 rounded">N8N_MCP_ACCESS_TOKEN</code> dans le backend.
        </p>
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
            selectedId && detail?.name
              ? `Explique-moi le workflow n8n ${detail.name} et dis-moi si son fonctionnement est coherent.`
              : "Liste mes workflows n8n importants et explique-moi leur utilite."
          )}
          className="px-3 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-text-muted hover:text-text-primary hover:border-accent-amber/30 hover:bg-accent-amber/10 transition-colors"
        >
          Expliquer les workflows
        </Link>
        <Link
          href={buildAssistantPromptUrl("Propose-moi une idee d'automatisation n8n utile a partir de mes outils connectes.")}
          className="px-3 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-text-muted hover:text-text-primary hover:border-accent-amber/30 hover:bg-accent-amber/10 transition-colors"
        >
          Imaginer une automatisation
        </Link>
      </div>
      {executeResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`shrink-0 rounded-xl border px-4 py-2 text-sm ${executeResult.ok ? "border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan" : "border-accent-rose/40 bg-accent-rose/10 text-accent-rose"}`}
        >
          {executeResult.message}
        </motion.div>
      )}
      <div className="glass-strong rounded-xl border border-white/10 overflow-hidden card-glow flex flex-col flex-1 min-h-0">
        <div className="p-3 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <NavIcon name="workflow" className="w-5 h-5 text-accent-violet" />
            <h2 className="font-semibold text-text-primary text-sm">Workflows n8n</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-accent-violet/20 text-accent-violet text-sm font-medium hover:bg-accent-violet/30 transition-colors flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Créer</span>
          </button>
        </div>
        <ul className="divide-y divide-white/5 flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {workflows.length === 0 ? (
              <li className="px-4 py-6 text-center text-text-muted text-sm">Aucun workflow.</li>
            ) : (
              workflows.map((w, i) => (
                <motion.li
                  key={w.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(w.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-medium text-text-primary truncate">{w.name || "Sans nom"}</p>
                    <p className="text-xs text-text-muted">
                      {w.active ? "Actif" : "Inactif"}
                      {w.triggerCount != null && ` · ${w.triggerCount} trigger(s)`}
                    </p>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {w.active ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeactivate(w.id);
                        }}
                        disabled={actioningId !== null}
                        className="px-2.5 py-1 rounded-lg bg-white/10 text-text-muted text-xs font-medium hover:bg-white/15 disabled:opacity-50 transition-colors"
                        title="Désactiver"
                      >
                        {actioningId === w.id && actionType === "deactivate" ? "…" : "⏸"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivate(w.id);
                        }}
                        disabled={actioningId !== null}
                        className="px-2.5 py-1 rounded-lg bg-white/10 text-text-muted text-xs font-medium hover:bg-white/15 disabled:opacity-50 transition-colors"
                        title="Activer"
                      >
                        {actioningId === w.id && actionType === "activate" ? "…" : "▶"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecute(w.id);
                      }}
                      disabled={executingId !== null}
                      className="px-3 py-1.5 rounded-lg bg-accent-violet/20 text-accent-violet text-sm font-medium hover:bg-accent-violet/30 disabled:opacity-50 transition-colors"
                    >
                      {executingId === w.id ? "Exécution…" : "Exécuter"}
                    </button>
                  </div>
                </motion.li>
              ))
            )}
          </AnimatePresence>
        </ul>
      </div>

      {/* Modal création */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-background border border-white/10 rounded-xl shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-text-primary text-sm mb-3">Créer un workflow</h3>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nom du workflow"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/50 mb-3"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-text-muted text-sm hover:bg-white/15 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !createName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-accent-violet/20 text-accent-violet text-sm font-medium hover:bg-accent-violet/30 disabled:opacity-50 transition-colors"
                >
                  {creating ? "Création…" : "Créer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal édition */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-background border border-white/10 rounded-xl shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-text-primary text-sm mb-3">Modifier le workflow</h3>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nom du workflow"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/50 mb-3"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdate();
                }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-text-muted text-sm hover:bg-white/15 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={editing || !editName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-accent-violet/20 text-accent-violet text-sm font-medium hover:bg-accent-violet/30 disabled:opacity-50 transition-colors"
                >
                  {editing ? "Mise à jour…" : "Enregistrer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer détail workflow */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60"
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="w-full max-w-md bg-background border-l border-white/10 shadow-xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-text-primary text-sm">Détail du workflow</h3>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-text-muted"
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {detailLoading ? (
                  <p className="text-text-muted text-sm">Chargement…</p>
                ) : detail ? (
                  <>
                    <div>
                      <p className="font-medium text-text-primary">{detail.name ?? "Sans nom"}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {detail.active ? "Actif" : "Inactif"} · ID : {selectedId}
                      </p>
                    </div>
                    {detail.nodes && detail.nodes.length > 0 && (
                      <div>
                        <p className="text-xs text-text-muted font-medium mb-1">Nœuds / déclencheurs</p>
                        <ul className="space-y-1 text-sm text-text-primary">
                          {detail.nodes.slice(0, 10).map((node, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-accent-violet">{node.type ?? "node"}</span>
                              {node.name && <span>{node.name}</span>}
                            </li>
                          ))}
                          {detail.nodes.length > 10 && (
                            <li className="text-text-muted">… et {detail.nodes.length - 10} autre(s)</li>
                          )}
                        </ul>
                      </div>
                    )}
                    {executeResultDetail && (
                      <p className={`text-sm ${executeResultDetail.ok ? "text-accent-cyan" : "text-accent-rose"}`}>
                        {executeResultDetail.message}
                      </p>
                    )}
                    <div className="pt-2 space-y-2">
                      <div className="flex gap-2">
                        {detail.active ? (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(selectedId)}
                            disabled={actioningId !== null}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 text-text-muted font-medium hover:bg-white/15 disabled:opacity-50 transition-colors"
                          >
                            {actioningId === selectedId && actionType === "deactivate" ? "Désactivation…" : "Désactiver"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivate(selectedId)}
                            disabled={actioningId !== null}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-accent-cyan/20 text-accent-cyan font-medium hover:bg-accent-cyan/30 disabled:opacity-50 transition-colors"
                          >
                            {actioningId === selectedId && actionType === "activate" ? "Activation…" : "Activer"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleExecute(selectedId)}
                          disabled={executingId !== null}
                          className="flex-1 px-4 py-2.5 rounded-lg bg-accent-violet/20 text-accent-violet font-medium hover:bg-accent-violet/30 disabled:opacity-50 transition-colors"
                        >
                          {executingId === selectedId ? "Exécution…" : "Exécuter"}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowEditModal(true)}
                          className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 text-text-primary font-medium hover:bg-white/15 transition-colors"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(selectedId)}
                          disabled={actioningId !== null}
                          className="flex-1 px-4 py-2.5 rounded-lg bg-accent-rose/20 text-accent-rose font-medium hover:bg-accent-rose/30 disabled:opacity-50 transition-colors"
                        >
                          {actioningId === selectedId && actionType === "delete" ? "Suppression…" : "Supprimer"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-accent-rose text-sm">Impossible de charger le détail.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
