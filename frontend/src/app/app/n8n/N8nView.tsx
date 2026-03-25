"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fetchBackend } from "@/lib/api";

type Workflow = {
  id: string;
  name?: string | null;
  description?: string | null;
  active?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  triggerCount?: number | null;
  canExecute?: boolean;
};

type WorkflowDetailsResponse = {
  workflow?: Record<string, unknown>;
  triggerInfo?: string;
  editorBaseUrl?: string;
  [key: string]: unknown;
};

const toPrettyJson = (value: unknown) => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
};

const defaultWorkflowTemplate = `{
  "name": "Nouveau workflow",
  "nodes": [],
  "connections": {},
  "settings": {}
}`;

const buildN8nWorkflowUrl = (base: string | null, workflowId?: string) => {
  const b = base?.trim().replace(/\/+$/, "");
  if (!b || !workflowId) return null;
  return `${b}/workflow/${encodeURIComponent(workflowId)}`;
};

/** Erreur métier renvoyée par le MCP même en HTTP 200. */
function extractExecutionLogicalError(obj: Record<string, unknown> | null | undefined): string | null {
  if (!obj || typeof obj !== "object") return null;
  if (obj.success === false) {
    if (typeof obj.error === "string") return obj.error;
    if (obj.error != null) return JSON.stringify(obj.error);
    return "Exécution signalée en échec par n8n.";
  }
  if (obj.error != null && obj.success !== true) {
    return typeof obj.error === "string" ? obj.error : JSON.stringify(obj.error);
  }
  return null;
}

export default function N8nView() {
  const [loadingList, setLoadingList] = useState(true);
  const [refreshingList, setRefreshingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editorBaseUrl, setEditorBaseUrl] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowJson, setWorkflowJson] = useState<string>("");
  const [workflowObject, setWorkflowObject] = useState<Record<string, unknown> | null>(null);
  const [templateJson, setTemplateJson] = useState<string>(defaultWorkflowTemplate);
  const [workflowRequest, setWorkflowRequest] = useState<string>("");
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [executionResult, setExecutionResult] = useState<unknown>(null);
  const [executionResultJson, setExecutionResultJson] = useState("");
  const [executionViewMode, setExecutionViewMode] = useState<"summary" | "raw">("summary");
  /** Erreur MCP / exécution uniquement (carte debug dédiée, pas la bannière générale). */
  const [executionError, setExecutionError] = useState<string | null>(null);

  const selectedWorkflow = useMemo(
    () => workflows.find((w) => w.id === selectedId) ?? null,
    [workflows, selectedId],
  );

  const loadWorkflows = useCallback(async (autoPickFirst = false) => {
    setError(null);
    setNotice(null);
    setRefreshingList(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "50");
      const r = await fetchBackend(`/api/n8n/workflows?${qs.toString()}`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `Impossible de lister les workflows (HTTP ${r.status}).`,
        );
      }
      const list = Array.isArray(data.workflows) ? (data.workflows as Workflow[]) : [];
      setWorkflows(list);
      setEditorBaseUrl(typeof data.editorBaseUrl === "string" ? data.editorBaseUrl : null);
      if (autoPickFirst && list.length > 0) {
        setSelectedId(list[0].id);
      }
      if (autoPickFirst && list.length === 0) {
        setSelectedId(null);
        setWorkflowJson("");
        setWorkflowObject(null);
        setNotice("Aucun workflow disponible pour le moment.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setRefreshingList(false);
      setLoadingList(false);
    }
  }, []);

  const loadDetails = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setError(null);
    setNotice(null);
    try {
      const r = await fetchBackend("/api/n8n/workflows/" + encodeURIComponent(id));
      const data = (await r.json().catch(() => ({}))) as WorkflowDetailsResponse;
      if (!r.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `Impossible de charger le workflow (HTTP ${r.status}).`,
        );
      }
      if (typeof data.editorBaseUrl === "string") setEditorBaseUrl(data.editorBaseUrl);
      const wf = (data.workflow && typeof data.workflow === "object" ? data.workflow : data) as Record<string, unknown>;
      setWorkflowObject(wf);
      setWorkflowJson(toPrettyJson(wf));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
      setWorkflowJson("");
      setWorkflowObject(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows(true);
  }, [loadWorkflows]);

  useEffect(() => {
    if (!selectedId) return;
    loadDetails(selectedId);
  }, [selectedId, loadDetails]);

  useEffect(() => {
    setExecutionError(null);
  }, [selectedId]);

  const handleExecute = useCallback(async () => {
    if (!selectedId) return;
    setExecuting(true);
    setExecutionError(null);
    setNotice(null);
    try {
      const r = await fetchBackend("/api/n8n/workflows/" + encodeURIComponent(selectedId) + "/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg =
          typeof (data as { error?: string })?.error === "string"
            ? (data as { error: string }).error
            : `Impossible d'exécuter le workflow (HTTP ${r.status}).`;
        setExecutionResult(null);
        setExecutionResultJson("");
        setExecutionError(msg);
        return;
      }
      setExecutionResult(data);
      setExecutionResultJson(JSON.stringify(data, null, 2));
      const obj = data as Record<string, unknown> | null;
      const logicalErr = extractExecutionLogicalError(obj);
      if (logicalErr) {
        setExecutionError(logicalErr);
        setNotice(null);
      } else {
        setExecutionError(null);
        setNotice("Workflow exécuté.");
      }
    } catch (e) {
      setExecutionResult(null);
      setExecutionResultJson("");
      setExecutionError(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setExecuting(false);
    }
  }, [selectedId]);

  const handleCopyJson = useCallback(async () => {
    if (!workflowJson) return;
    try {
      await navigator.clipboard.writeText(workflowJson);
      setNotice("JSON copié.");
    } catch {
      setError("Impossible de copier le JSON (clipboard indisponible).");
    }
  }, [workflowJson]);

  const handleCopyTemplateJson = useCallback(async () => {
    if (!templateJson.trim()) {
      setError("Aucun JSON à copier.");
      return;
    }
    try {
      await navigator.clipboard.writeText(templateJson);
      setNotice("JSON copié dans le presse-papiers.");
    } catch {
      setError("Impossible de copier le JSON.");
    }
  }, [templateJson]);

  const handleGenerateTemplateJson = useCallback(async () => {
    const prompt = workflowRequest.trim();
    if (!prompt) {
      setError("Décris clairement le workflow que tu veux générer.");
      return;
    }
    setGeneratingTemplate(true);
    setError(null);
    setNotice(null);
    try {
      const r = await fetchBackend("/api/n8n/generate-workflow-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok) {
        setError("La génération n'a pas pu aboutir. Réessaie dans un instant.");
        return;
      }
      const pretty =
        typeof data?.prettyJson === "string"
          ? data.prettyJson
          : JSON.stringify(data?.json ?? {}, null, 2);
      setTemplateJson(pretty);
    } catch {
      setError("La génération n'a pas pu aboutir. Réessaie dans un instant.");
    } finally {
      setGeneratingTemplate(false);
    }
  }, [workflowRequest]);

  const nodesSummary = useMemo(() => {
    const nodes = Array.isArray(workflowObject?.nodes) ? (workflowObject?.nodes as Array<Record<string, unknown>>) : [];
    const triggerNodes = nodes.filter((n) => {
      const t = String(n.type ?? "").toLowerCase();
      return t.includes("trigger") || t.includes("webhook") || t.includes("cron") || t.includes("schedule");
    });
    return {
      total: nodes.length,
      triggers: triggerNodes.length,
      top: nodes.slice(0, 8),
    };
  }, [workflowObject]);

  const handleCopyExecutionResult = useCallback(async () => {
    if (!executionResultJson) return;
    try {
      await navigator.clipboard.writeText(executionResultJson);
      setNotice("Résultat d'exécution copié.");
    } catch {
      setError("Impossible de copier le résultat.");
    }
  }, [executionResultJson]);

  const handleCopyExecutionError = useCallback(async () => {
    if (!executionError) return;
    try {
      await navigator.clipboard.writeText(executionError);
      setNotice("Message d'erreur copié.");
    } catch {
      setError("Impossible de copier l'erreur.");
    }
  }, [executionError]);

  const executionMeta = useMemo(() => {
    if (!executionResult || typeof executionResult !== "object") return null;
    const obj = executionResult as Record<string, unknown>;
    return {
      success: typeof obj.success === "boolean" ? obj.success : null,
      executionId: typeof obj.executionId === "string" ? obj.executionId : null,
      hasResult: obj.result !== undefined,
      hasError: obj.error !== undefined && obj.error !== null,
      errorText:
        typeof obj.error === "string"
          ? obj.error
          : obj.error
            ? JSON.stringify(obj.error)
            : null,
    };
  }, [executionResult]);

  return (
    <motion.div
      className="flex flex-col flex-1 min-h-0 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="rounded-xl border border-accent-amber/35 bg-gradient-to-br from-accent-amber/10 via-white/[0.03] to-accent-violet/10 p-3 card-glow">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-sm font-semibold text-text-primary">Créer un nouveau workflow (JSON)</p>
            <p className="text-xs text-text-muted">
              Décris ton besoin en une phrase, puis génère un JSON n8n prêt à copier-coller. Avec le MCP n8n
              configuré, la génération s’appuie sur des workflows réels de ton instance.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGenerateTemplateJson}
              disabled={generatingTemplate}
              className="px-3 py-1.5 rounded-lg bg-accent-amber/20 text-amber-200 text-sm font-semibold hover:bg-accent-amber/30 disabled:opacity-50 transition-colors border border-accent-amber/40"
            >
              {generatingTemplate ? "Génération..." : "Générer le JSON"}
            </button>
            <button
              type="button"
              onClick={handleCopyTemplateJson}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-text-primary text-sm font-semibold hover:bg-white/15 border border-white/15 transition-colors"
            >
              Copier
            </button>
          </div>
        </div>
        <textarea
          value={workflowRequest}
          onChange={(e) => setWorkflowRequest(e.target.value)}
          placeholder="Ex: Crée un workflow qui récupère les 10 derniers emails et prépare une réponse automatique personnalisée."
          className="w-full min-h-[96px] rounded-lg border border-accent-amber/30 bg-black/30 p-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber/40 mb-3"
        />
        <textarea
          value={templateJson}
          onChange={(e) => setTemplateJson(e.target.value)}
          spellCheck={false}
          className="w-full min-h-[170px] rounded-lg border border-accent-amber/30 bg-black/30 p-3 text-xs font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber/40"
        />
      </div>

      {error && (
        <div className="shrink-0 rounded-xl border border-accent-rose/40 bg-accent-rose/10 text-accent-rose px-4 py-2 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="shrink-0 rounded-xl border border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan px-4 py-2 text-sm">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        <div className="glass-strong rounded-xl border border-white/10 overflow-hidden flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-white/10 text-sm text-text-muted flex items-center justify-between gap-2">
            <span>Choisir un workflow existant à exécuter ({workflows.length})</span>
            <button
              type="button"
              onClick={() => loadWorkflows(false)}
              disabled={refreshingList}
              className="px-2.5 py-1 rounded-lg bg-white/10 text-text-muted text-xs font-medium hover:bg-white/15 disabled:opacity-50 transition-colors"
            >
              {refreshingList ? "Actualisation..." : "Actualiser"}
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/5">
            {loadingList ? (
              <p className="p-4 text-sm text-text-muted">Chargement...</p>
            ) : workflows.length === 0 ? (
              <p className="p-4 text-sm text-text-muted">Aucun workflow.</p>
            ) : (
              workflows.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedId(w.id)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors ${
                    selectedId === w.id ? "bg-white/5" : ""
                  }`}
                >
                  <p className="font-medium text-text-primary truncate">{w.name || "Sans nom"}</p>
                  <p className="text-xs text-text-muted">
                    {w.active ? "Actif" : "Inactif"}
                    {w.triggerCount != null ? ` · ${w.triggerCount} déclencheur(s)` : ""}
                    {w.canExecute === false ? " · exécution non autorisée" : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="glass-strong rounded-xl border border-white/10 overflow-hidden flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                {selectedWorkflow?.name || "Détails du workflow"}
              </p>
              {selectedWorkflow && (
                <p className="text-xs text-text-muted truncate">
                  ID: {selectedWorkflow.id}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedWorkflow && buildN8nWorkflowUrl(editorBaseUrl, selectedWorkflow.id) && (
                <a
                  href={buildN8nWorkflowUrl(editorBaseUrl, selectedWorkflow.id) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-white/10 text-text-muted text-xs font-medium hover:bg-white/15 transition-colors"
                >
                  Ouvrir n8n ↗
                </a>
              )}
              <button
                type="button"
                onClick={handleExecute}
                disabled={!selectedWorkflow || executing || selectedWorkflow?.canExecute === false}
                className="px-3 py-1.5 rounded-lg bg-accent-violet/20 text-accent-violet text-sm font-medium hover:bg-accent-violet/30 disabled:opacity-50 transition-colors"
              >
                  {executing ? "Exécution..." : "Exécuter"}
              </button>
              <button
                type="button"
                onClick={handleCopyJson}
                disabled={!workflowJson}
                className="px-3 py-1.5 rounded-lg bg-accent-cyan/20 text-accent-cyan text-sm font-semibold hover:bg-accent-cyan/30 border border-accent-cyan/35 disabled:opacity-50 transition-colors"
              >
                Copier JSON
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {loadingDetail ? (
              <p className="text-sm text-text-muted">Chargement du detail...</p>
            ) : (
              <>
                <div className="rounded-lg border border-accent-violet/30 bg-accent-violet/10 p-3">
                  <p className="text-xs text-text-muted">
                    L’exécution suit le déclencheur du workflow. Le bouton « Exécuter » envoie un appel MCP (webhook, corps
                    JSON vide dans webhookData) ; pour un chat ou un formulaire, le workflow doit correspondre ou il faut
                    passer des entrées typées via l’API.
                  </p>
                </div>

                {executionError ? (
                  <div
                    className="rounded-xl border border-accent-rose/45 bg-gradient-to-br from-accent-rose/15 to-black/30 p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                    role="alert"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-accent-rose/95">
                          Erreur d&apos;exécution (debug)
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Détail renvoyé par le serveur ou le MCP n8n — utile pour corriger le workflow ou les paramètres.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCopyExecutionError()}
                        className="shrink-0 px-2.5 py-1 rounded-lg bg-white/10 text-text-primary text-xs font-medium hover:bg-white/15 border border-white/15"
                      >
                        Copier l&apos;erreur
                      </button>
                    </div>
                    <pre className="max-h-[min(70vh,28rem)] overflow-x-auto overflow-y-auto rounded-lg border border-accent-rose/25 bg-black/40 p-3 text-[11px] font-mono text-text-primary whitespace-pre-wrap break-words [scrollbar-width:thin]">
                      {executionError}
                    </pre>
                  </div>
                ) : null}

                {selectedWorkflow && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-text-muted mb-1">Résumé du workflow</p>
                    <p className="text-sm text-text-primary">
                      {nodesSummary.total} noeud(s) dont {nodesSummary.triggers} déclencheur(s).
                    </p>
                    {selectedWorkflow?.canExecute === false ? (
                      <p className="text-xs text-accent-rose mt-2">Tu n'as pas la permission d'exécuter ce workflow.</p>
                    ) : null}
                    {nodesSummary.top.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {nodesSummary.top.map((node, idx) => (
                          <li key={idx} className="text-xs text-text-muted">
                            - {String(node.name ?? `Noeud ${idx + 1}`)} ({String(node.type ?? "type inconnu")})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs text-text-muted">Résultat d'exécution</p>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg border border-white/15 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExecutionViewMode("summary")}
                          className={`px-2.5 py-1 text-xs ${executionViewMode === "summary" ? "bg-white/15 text-text-primary" : "bg-white/5 text-text-muted hover:bg-white/10"}`}
                        >
                          Synthèse
                        </button>
                        <button
                          type="button"
                          onClick={() => setExecutionViewMode("raw")}
                          className={`px-2.5 py-1 text-xs border-l border-white/15 ${executionViewMode === "raw" ? "bg-white/15 text-text-primary" : "bg-white/5 text-text-muted hover:bg-white/10"}`}
                        >
                          JSON brut
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyExecutionResult}
                        disabled={!executionResultJson}
                        className="px-2.5 py-1 rounded-lg bg-white/10 text-text-primary text-xs hover:bg-white/15 disabled:opacity-50"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                  {!executionResultJson ? (
                    <p className="text-xs text-text-muted">
                      Lance une exécution pour voir le retour du workflow ici (success, executionId, result, error).
                    </p>
                  ) : executionViewMode === "summary" ? (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
                          <p className="text-text-dim">Statut</p>
                          <p className={`${executionMeta?.success ? "text-accent-cyan" : "text-accent-rose"}`}>
                            {executionMeta?.success ? "Succès" : "Erreur"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
                          <p className="text-text-dim">Execution ID</p>
                          <p className="text-text-primary font-mono truncate">{executionMeta?.executionId ?? "-"}</p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
                        <p className="text-text-dim">Données retournées</p>
                        <p className="text-text-primary">
                          {executionMeta?.hasResult ? "Le workflow a renvoyé un objet result." : "Aucun result explicite."}
                        </p>
                      </div>
                      {executionMeta?.hasError ? (
                        <div className="rounded-lg border border-accent-rose/30 bg-accent-rose/10 px-2.5 py-2">
                          <p className="text-accent-rose">Erreur</p>
                          <p className="text-text-primary break-all">{executionMeta.errorText ?? "Erreur non détaillée."}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <textarea
                      value={executionResultJson}
                      readOnly
                      spellCheck={false}
                      className="w-full min-h-[180px] rounded-lg border border-accent-cyan/30 bg-black/30 p-3 text-xs font-mono text-text-primary focus:outline-none"
                    />
                  )}
                  {executionResult && typeof executionResult === "object" && "success" in (executionResult as Record<string, unknown>) ? (
                    <p className={`mt-2 text-xs ${Boolean((executionResult as { success?: boolean }).success) ? "text-accent-cyan" : "text-accent-rose"}`}>
                      {Boolean((executionResult as { success?: boolean }).success) ? "Exécution réussie." : "Exécution en erreur."}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 p-3">
                  <p className="text-xs text-text-muted mb-2">Détail JSON du workflow sélectionné</p>
                  <textarea
                    value={workflowJson}
                    readOnly
                    spellCheck={false}
                    placeholder="Le détail du workflow apparaît ici."
                    className="w-full min-h-[320px] rounded-lg border border-accent-cyan/30 bg-black/30 p-3 text-xs font-mono text-text-primary focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
