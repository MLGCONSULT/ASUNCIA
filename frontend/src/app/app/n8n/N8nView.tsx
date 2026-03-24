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
  const [executeInputType, setExecuteInputType] = useState<"chat" | "form" | "webhook">("chat");
  const [chatInput, setChatInput] = useState("Execution manuelle depuis AsuncIA");
  const [formDataJson, setFormDataJson] = useState("{}");
  const [webhookMethod, setWebhookMethod] = useState("POST");
  const [webhookBodyJson, setWebhookBodyJson] = useState("{}");
  const [webhookQueryJson, setWebhookQueryJson] = useState("{}");
  const [executionResult, setExecutionResult] = useState<unknown>(null);
  const [executionResultJson, setExecutionResultJson] = useState("");
  const [executionViewMode, setExecutionViewMode] = useState<"summary" | "raw">("summary");

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

  const handleExecute = useCallback(async () => {
    if (!selectedId) return;
    setExecuting(true);
    setError(null);
    setNotice(null);
    try {
      let inputs: Record<string, unknown>;
      if (executeInputType === "chat") {
        inputs = { type: "chat", chatInput: chatInput.trim() || "Execution manuelle depuis AsuncIA" };
      } else if (executeInputType === "form") {
        let formData: Record<string, unknown> = {};
        try {
          formData = JSON.parse(formDataJson || "{}") as Record<string, unknown>;
        } catch {
          throw new Error("Le JSON de formData est invalide.");
        }
        inputs = { type: "form", formData };
      } else {
        let bodyObj: Record<string, unknown> = {};
        let queryObj: Record<string, string> = {};
        try {
          bodyObj = JSON.parse(webhookBodyJson || "{}") as Record<string, unknown>;
        } catch {
          throw new Error("Le JSON de webhook body est invalide.");
        }
        try {
          queryObj = JSON.parse(webhookQueryJson || "{}") as Record<string, string>;
        } catch {
          throw new Error("Le JSON de webhook query est invalide.");
        }
        inputs = {
          type: "webhook",
          webhookData: {
            method: webhookMethod,
            query: queryObj,
            body: bodyObj,
          },
        };
      }

      const r = await fetchBackend("/api/n8n/workflows/" + encodeURIComponent(selectedId) + "/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `Impossible d'executer le workflow (HTTP ${r.status}).`,
        );
      }
      setExecutionResult(data);
      setExecutionResultJson(JSON.stringify(data, null, 2));
      setNotice("Workflow exécuté.");
    } catch (e) {
      setExecutionResult(null);
      setExecutionResultJson("");
      setError(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setExecuting(false);
    }
  }, [selectedId, executeInputType, chatInput, formDataJson, webhookBodyJson, webhookMethod, webhookQueryJson]);

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
      const endpoints = ["/api/n8n/generate-workflow-json", "/api/n8n/generate-mock-json"];
      let data: Record<string, unknown> = {};
      let success = false;
      let lastStatus = 0;
      let lastError = "";
      for (const endpoint of endpoints) {
        const r = await fetchBackend(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
        if (r.ok) {
          data = body;
          success = true;
          break;
        }
        lastStatus = r.status;
        lastError = typeof body?.error === "string" ? body.error : "";
      }
      if (!success) {
        throw new Error(lastError || `Impossible de générer le JSON du workflow (HTTP ${lastStatus || 500}).`);
      }
      const pretty =
        typeof data?.prettyJson === "string"
          ? data.prettyJson
          : JSON.stringify(data?.json ?? {}, null, 2);
      setTemplateJson(pretty);
      setNotice("JSON généré. Tu peux le copier-coller dans n8n.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
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
            <p className="text-sm font-semibold text-text-primary">Assistant JSON workflow</p>
            <p className="text-xs text-text-muted">
              Décris ton besoin en une phrase, puis génère un JSON n8n prêt à copier-coller.
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
            <span>Workflows existants ({workflows.length})</span>
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
                  <p className="text-xs text-text-muted mb-2">Choisis le type d'entrée</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(["chat", "form", "webhook"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setExecuteInputType(mode)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          executeInputType === mode
                            ? "bg-accent-violet/20 border-accent-violet/40 text-accent-violet"
                            : "bg-white/5 border-white/10 text-text-muted hover:bg-white/10"
                        }`}
                      >
                        {mode === "chat" ? "Texte" : mode === "form" ? "JSON simple" : "Webhook"}
                      </button>
                    ))}
                  </div>
                  {executeInputType === "chat" ? (
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Texte envoyé au workflow chat"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-xs focus:outline-none"
                    />
                  ) : null}
                  {executeInputType === "form" ? (
                    <textarea
                      value={formDataJson}
                      onChange={(e) => setFormDataJson(e.target.value)}
                      spellCheck={false}
                      className="w-full min-h-[90px] rounded-lg border border-white/10 bg-black/30 p-2 text-xs font-mono text-text-primary focus:outline-none"
                    />
                  ) : null}
                  {executeInputType === "webhook" ? (
                    <div className="space-y-2">
                      <select
                        value={webhookMethod}
                        onChange={(e) => setWebhookMethod(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-xs focus:outline-none"
                      >
                        {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <textarea
                        value={webhookQueryJson}
                        onChange={(e) => setWebhookQueryJson(e.target.value)}
                        spellCheck={false}
                        placeholder='Query JSON, ex: {"source":"asuncia"}'
                        className="w-full min-h-[70px] rounded-lg border border-white/10 bg-black/30 p-2 text-xs font-mono text-text-primary focus:outline-none"
                      />
                      <textarea
                        value={webhookBodyJson}
                        onChange={(e) => setWebhookBodyJson(e.target.value)}
                        spellCheck={false}
                        placeholder='Body JSON, ex: {"email":"x@y.com"}'
                        className="w-full min-h-[90px] rounded-lg border border-white/10 bg-black/30 p-2 text-xs font-mono text-text-primary focus:outline-none"
                      />
                    </div>
                  ) : null}
                </div>

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
                <textarea
                  value={workflowJson}
                  readOnly
                  spellCheck={false}
                  placeholder="Le JSON du workflow apparaît ici (copiable)."
                  className="w-full min-h-[360px] rounded-lg border border-accent-cyan/30 bg-black/30 p-3 text-xs font-mono text-text-primary focus:outline-none"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
