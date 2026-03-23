"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fetchBackend } from "@/lib/api";
import NavIcon from "@/components/NavIcon";

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

const normalizeTriggerInfoToFrench = (value: string) => {
  return value
    .replace("This workflow has the following trigger(s):", "Ce workflow contient les déclencheurs suivants :")
    .replace("Schedule trigger(s):", "Déclencheur(s) planifié(s) :")
    .replace("Scheduled workflows can be executed directly through MCP clients and do not require external inputs.", "Les workflows planifiés peuvent être exécutés directement via MCP et ne nécessitent pas d'entrée externe.")
    .replace(/Node name:/g, "Nom du noeud :");
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
  const [query, setQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [runningQuery, setRunningQuery] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editorBaseUrl, setEditorBaseUrl] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [triggerInfo, setTriggerInfo] = useState<string>("");
  const [workflowJson, setWorkflowJson] = useState<string>("");
  const [workflowObject, setWorkflowObject] = useState<Record<string, unknown> | null>(null);
  const [templateJson, setTemplateJson] = useState<string>(defaultWorkflowTemplate);

  const selectedWorkflow = useMemo(
    () => workflows.find((w) => w.id === selectedId) ?? null,
    [workflows, selectedId],
  );

  const runSearch = useCallback(async (q: string, autoPickFirst = false) => {
    setError(null);
    setNotice(null);
    setRunningQuery(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "50");
      if (q.trim()) qs.set("query", q.trim());
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
        setTriggerInfo("");
        setNotice("Aucun workflow trouvé pour cette demande.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setRunningQuery(false);
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
      setTriggerInfo(typeof data.triggerInfo === "string" ? normalizeTriggerInfoToFrench(data.triggerInfo) : "");
      setWorkflowJson(toPrettyJson(wf));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
      setWorkflowJson("");
      setWorkflowObject(null);
      setTriggerInfo("");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    runSearch("", true);
  }, [runSearch]);

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
      const r = await fetchBackend("/api/n8n/workflows/" + encodeURIComponent(selectedId) + "/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: { type: "chat", chatInput: "Execution manuelle depuis AsuncIA" },
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `Impossible d'executer le workflow (HTTP ${r.status}).`,
        );
      }
      setNotice("Workflow execute.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setExecuting(false);
    }
  }, [selectedId]);

  const handleCopyJson = useCallback(async () => {
    if (!workflowJson) return;
    try {
      await navigator.clipboard.writeText(workflowJson);
      setNotice("JSON copie dans le presse-papiers.");
    } catch {
      setError("Impossible de copier le JSON (clipboard indisponible).");
    }
  }, [workflowJson]);

  const handleCopyTemplateJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(templateJson);
      setNotice("Template JSON copié. Colle-le dans l'éditeur n8n pour créer un workflow.");
    } catch {
      setError("Impossible de copier le template JSON.");
    }
  }, [templateJson]);

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

  return (
    <motion.div
      className="flex flex-col flex-1 min-h-0 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="glass-strong rounded-xl border border-white/10 p-3 card-glow">
        <div className="flex items-center gap-2 mb-2">
          <NavIcon name="workflow" className="w-5 h-5 text-accent-violet" />
          <p className="font-semibold text-text-primary text-sm">Agent Workflow n8n</p>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch(query, true);
            }}
            placeholder="Demande un workflow (ex: generation visuels, projet asuncia, webhook...)"
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/50"
          />
          <button
            type="button"
            onClick={() => runSearch(query, true)}
            disabled={runningQuery}
            className="px-3 py-2 rounded-lg bg-accent-violet/20 text-accent-violet text-sm font-medium hover:bg-accent-violet/30 disabled:opacity-50 transition-colors"
          >
            {runningQuery ? "Recherche..." : "Trouver"}
          </button>
          <button
            type="button"
            onClick={() => runSearch("", false)}
            disabled={runningQuery}
            className="px-3 py-2 rounded-lg bg-white/10 text-text-muted text-sm font-medium hover:bg-white/15 disabled:opacity-50 transition-colors"
          >
            Tout
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-accent-amber/35 bg-gradient-to-br from-accent-amber/10 via-white/[0.03] to-accent-violet/10 p-3 card-glow">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <p className="text-sm font-semibold text-text-primary">Créer un workflow (JSON)</p>
            <p className="text-xs text-text-muted">
              Génère ici ton JSON puis copie-colle dans n8n (Nouveau workflow &gt; Import from JSON).
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyTemplateJson}
            className="px-3 py-1.5 rounded-lg bg-accent-amber/20 text-amber-200 text-sm font-semibold hover:bg-accent-amber/30 border border-accent-amber/40 transition-colors"
          >
            Copier le JSON
          </button>
        </div>
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
          <div className="px-3 py-2 border-b border-white/10 text-sm text-text-muted">
            Workflows disponibles ({workflows.length})
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
                    {w.triggerCount != null ? ` · ${w.triggerCount} trigger(s)` : ""}
                    {w.canExecute === false ? " · non executable" : ""}
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
                {selectedWorkflow?.name || "Selectionne un workflow"}
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
                disabled={!selectedWorkflow || executing}
                className="px-3 py-1.5 rounded-lg bg-accent-violet/20 text-accent-violet text-sm font-medium hover:bg-accent-violet/30 disabled:opacity-50 transition-colors"
              >
                {executing ? "Execution..." : "Executer"}
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
                {selectedWorkflow && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-text-muted mb-1">Résumé du workflow</p>
                    <p className="text-sm text-text-primary">
                      {nodesSummary.total} noeud(s) dont {nodesSummary.triggers} déclencheur(s).
                    </p>
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
                {triggerInfo && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-text-muted mb-1">Comment le déclencher</p>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{triggerInfo}</p>
                  </div>
                )}
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
