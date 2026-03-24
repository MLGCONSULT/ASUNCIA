"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { fetchBackend } from "@/lib/api";
import { buildAssistantPromptUrl } from "@/lib/assistant-intents";

type Base = { id: string; name: string };
type Table = { id: string; name: string };
type AirtableRecordRow = { id: string; createdTime?: string; fields: Record<string, unknown> };

type Props = {
  hasAirtable: boolean;
};

function refreshRecords(
  baseId: string,
  tableId: string,
  setRecords: (r: AirtableRecordRow[]) => void,
  setRecordsLoading: (b: boolean) => void,
  setError: (e: string | null) => void
) {
  setRecordsLoading(true);
  fetchBackend(`/api/airtable/bases/${baseId}/tables/${tableId}/records`)
    .then((r) => r.json())
    .then((data) => {
      if (data.error) throw new Error(data.error);
      setRecords(data.records ?? []);
    })
    .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
    .finally(() => setRecordsLoading(false));
}

export default function AirtableView({ hasAirtable: initialHasAirtable }: Props) {
  const searchParams = useSearchParams();
  const [hasAirtable, setHasAirtable] = useState(initialHasAirtable);
  const [connectionSource, setConnectionSource] = useState<"oauth" | "server-token" | "none">(
    initialHasAirtable ? "oauth" : "none"
  );
  const [canDisconnect, setCanDisconnect] = useState(initialHasAirtable);
  const [status, setStatus] = useState<{
    selectedMode: "oauth" | "server-token" | "none";
    configured: boolean;
    statusChecked: boolean;
  }>({
    selectedMode: initialHasAirtable ? "oauth" : "none",
    configured: initialHasAirtable,
    statusChecked: false,
  });
  const [statusLoading, setStatusLoading] = useState(false);
  const [callbackMessage, setCallbackMessage] = useState<"success" | "error" | null>(null);
  const [callbackErrorText, setCallbackErrorText] = useState<string | null>(null);
  const [bases, setBases] = useState<Base[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBase, setSelectedBase] = useState<Base | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesDebugEnabled, setTablesDebugEnabled] = useState(false);
  const [tablesDebugText, setTablesDebugText] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [records, setRecords] = useState<AirtableRecordRow[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AirtableRecordRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    setHasAirtable(initialHasAirtable);
    setConnectionSource(initialHasAirtable ? "oauth" : "none");
    setCanDisconnect(initialHasAirtable);
    setStatus({
      selectedMode: initialHasAirtable ? "oauth" : "none",
      configured: initialHasAirtable,
      statusChecked: false,
    });
  }, [initialHasAirtable]);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const response = await fetchBackend("/api/auth/airtable/status");
      const data = await response.json();
      const selectedMode =
        (data.selectedMode as "oauth" | "server-token" | "none" | undefined) ??
        ((data.source as "oauth" | "server-token" | "none" | undefined) ?? "none");
      const configured = Boolean(data.configured);
      setStatus({
        selectedMode,
        configured,
        statusChecked: true,
      });

      if (selectedMode === "server-token") {
        if (configured) {
          setHasAirtable(true);
          setConnectionSource("server-token");
          setCanDisconnect(false);
        } else {
          setHasAirtable(false);
          setConnectionSource("server-token");
          setCanDisconnect(false);
        }
        return;
      }

      if (typeof data.connected === "boolean") {
        setHasAirtable(data.connected);
        setConnectionSource((data.source as "oauth" | "server-token" | "none") ?? "none");
        setCanDisconnect(Boolean(data.canDisconnect));
      }
    } catch {
      setStatus((prev) => ({ ...prev, statusChecked: true }));
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const callbackError = searchParams.get("error");
    if (connected === "true" || connected === "1") {
      setCallbackMessage("success");
      setCallbackErrorText(null);
      setHasAirtable(true);
      setConnectionSource("oauth");
      setCanDisconnect(true);
      setStatus({
        selectedMode: "oauth",
        configured: true,
        statusChecked: true,
      });
      window.history.replaceState({}, "", "/app/airtable");
      return;
    }
    if (callbackError) {
      setCallbackMessage("error");
      setCallbackErrorText(decodeURIComponent(callbackError));
      window.history.replaceState({}, "", "/app/airtable");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!hasAirtable) {
      setLoading(false);
      setBases([]);
      setTables([]);
      setRecords([]);
      setSelectedBase(null);
      setSelectedTable(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchBackend("/api/airtable/bases")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBases(data.bases ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [hasAirtable]);

  useEffect(() => {
    if (!selectedBase) {
      setTables([]);
      setTablesDebugText("");
      setSelectedTable(null);
      return;
    }
    setTablesLoading(true);
    setRecords([]);
    setSelectedTable(null);
    const debugQuery = tablesDebugEnabled ? "?debug=1" : "";
    fetchBackend(`/api/airtable/bases/${selectedBase.id}/tables${debugQuery}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTables(data.tables ?? []);
        if (tablesDebugEnabled) {
          setTablesDebugText(
            JSON.stringify(
              {
                debug: data?._debug ?? null,
                tablesPreview: Array.isArray(data?.tables) ? data.tables.slice(0, 10) : [],
              },
              null,
              2,
            ),
          );
        } else {
          setTablesDebugText("");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setTablesLoading(false));
  }, [selectedBase, tablesDebugEnabled]);

  const reloadRecords = useCallback(() => {
    if (!selectedBase || !selectedTable) return;
    refreshRecords(selectedBase.id, selectedTable.id, setRecords, setRecordsLoading, setError);
  }, [selectedBase, selectedTable]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const response = await fetchBackend("/api/auth/airtable/redirect");
      const data = await response.json();
      if (!response.ok || !data.redirectUrl) {
        setError(data?.error ?? "Impossible de lancer la connexion Airtable.");
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("Impossible de lancer la connexion Airtable.");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchBackend("/api/auth/airtable/disconnect", { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Impossible de déconnecter Airtable.");
        return;
      }
      setHasAirtable(false);
      setBases([]);
      setTables([]);
      setRecords([]);
      setSelectedBase(null);
      setSelectedTable(null);
      setCallbackMessage(null);
      setCallbackErrorText(null);
      setConnectionSource("none");
      setCanDisconnect(false);
    } catch {
      setError("Impossible de déconnecter Airtable.");
    } finally {
      setLoading(false);
      setConnecting(false);
    }
  }

  useEffect(() => {
    if (!selectedBase || !selectedTable) {
      setRecords([]);
      return;
    }
    refreshRecords(selectedBase.id, selectedTable.id, setRecords, setRecordsLoading, setError);
  }, [selectedBase, selectedTable]);

  if (!hasAirtable) {
    if (!status.statusChecked) {
      return (
        <motion.div className="glass-strong rounded-xl border border-white/10 p-6 card-glow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-semibold text-text-primary mb-2">Vérification de la configuration Airtable</p>
          <p className="text-text-muted text-sm">Détection du mode de connexion en cours…</p>
        </motion.div>
      );
    }

    if (status.selectedMode === "server-token") {
      return (
        <motion.div className="glass-strong rounded-xl border border-accent-cyan/30 p-6 card-glow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-semibold text-text-primary mb-2">Mode token serveur détecté</p>
          <p className="text-text-muted text-sm mb-4">
            Le mode token serveur est actif, mais Airtable n&apos;est pas encore configuré côté backend.
            Vérifiez la configuration serveur puis relancez la détection.
          </p>
          <button
            type="button"
            onClick={loadStatus}
            disabled={statusLoading}
            className="px-4 py-2 rounded-lg bg-accent-cyan/20 text-accent-cyan font-medium hover:bg-accent-cyan/30 disabled:opacity-50 transition-colors"
          >
            {statusLoading ? "Vérification…" : "Réessayer"}
          </button>
        </motion.div>
      );
    }

    return (
      <motion.div className="glass-strong rounded-xl border border-white/10 p-6 card-glow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="font-semibold text-text-primary mb-2">Connectez votre compte Airtable</p>
        <p className="text-text-muted text-sm mb-4">Connectez votre compte Airtable pour accéder à vos bases et tables.</p>
        <button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          className="px-4 py-2 rounded-lg bg-accent-cyan/20 text-accent-cyan font-medium hover:bg-accent-cyan/30 disabled:opacity-50 transition-colors"
        >
          {connecting ? "Connexion…" : "Se connecter à Airtable"}
        </button>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <motion.div className="glass-strong rounded-xl border border-white/10 p-6 card-glow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 text-text-muted">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="w-2 h-2 rounded-full bg-accent-violet" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </div>
          Chargement des bases…
        </div>
      </motion.div>
    );
  }

  if (error && bases.length === 0) {
    return (
      <motion.div className="glass-strong rounded-xl border border-accent-rose/30 p-6 card-glow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-accent-rose font-semibold">Airtable non disponible</p>
        <p className="text-text-muted text-sm mt-1">{error}</p>
        <div className="flex gap-2 mt-4">
          {canDisconnect ? (
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-text-muted text-sm hover:bg-white/15"
            >
              Déconnecter
            </button>
          ) : null}
          <button
            type="button"
            onClick={loadStatus}
            disabled={statusLoading}
            className="px-3 py-1.5 rounded-lg bg-accent-cyan/20 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/30"
          >
            {statusLoading ? "Vérification…" : "Réessayer"}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="flex-1 min-h-0 flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex flex-wrap gap-2 shrink-0">
        {selectedBase && selectedTable ? (
          <Link
            href={buildAssistantPromptUrl(`Analyse la table ${selectedTable.name} de la base ${selectedBase.name}. Donne-moi: 1) qualité des données, 2) anomalies visibles, 3) top 5 actions concrètes.`)}
            className="px-3 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-text-muted hover:text-text-primary hover:border-accent-fuchsia/30 hover:bg-accent-fuchsia/10 transition-colors"
          >
            Agent IA: analyser cette table
          </Link>
        ) : null}
      </div>
      {callbackMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`shrink-0 rounded-xl border px-4 py-2 text-sm ${
            callbackMessage === "success"
              ? "border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan"
              : "border-accent-rose/40 bg-accent-rose/10 text-accent-rose"
          }`}
        >
          {callbackMessage === "success" ? "Airtable connecté avec succès !" : callbackErrorText || "Erreur lors de la connexion"}
        </motion.div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        <div className="glass-strong rounded-xl border border-white/10 overflow-hidden card-glow flex flex-col min-h-0">
          <div className="p-3 border-b border-white/10 shrink-0 flex items-center justify-between">
            <h2 className="font-semibold text-text-primary text-sm">
              Bases
              {connectionSource === "server-token" ? (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-accent-cyan">Token serveur</span>
              ) : null}
            </h2>
            {canDisconnect ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-2 py-1 rounded text-xs text-text-muted hover:text-accent-rose hover:bg-white/5 transition-colors"
                title="Déconnecter Airtable"
              >
                Déconnecter
              </button>
            ) : null}
          </div>
          <ul className="divide-y divide-white/5 flex-1 min-h-0 overflow-y-auto">
            {bases.map((base, i) => (
              <motion.li key={base.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <div className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${selectedBase?.id === base.id ? "bg-accent-cyan/15 border-l-2 border-accent-cyan" : "text-text-muted hover:bg-white/5"}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedBase(base)}
                    className={`min-w-0 flex-1 text-left truncate ${selectedBase?.id === base.id ? "text-accent-cyan" : "text-text-muted hover:text-text-primary"}`}
                  >
                    {base.name}
                  </button>
                  <a
                    href={`https://airtable.com/${encodeURIComponent(base.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs text-text-muted hover:text-accent-cyan"
                    title="Ouvrir la base dans Airtable"
                  >
                    ↗
                  </a>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
        <div className="glass-strong rounded-xl border border-white/10 overflow-hidden card-glow flex flex-col min-h-0">
          <div className="p-3 border-b border-white/10 shrink-0 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-text-primary text-sm">Tables</h2>
              {selectedBase && <p className="text-xs text-text-muted mt-0.5">{selectedBase.name}</p>}
            </div>
            <button
              type="button"
              onClick={() => setTablesDebugEnabled((v) => !v)}
              className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                tablesDebugEnabled
                  ? "border-accent-amber/45 bg-accent-amber/15 text-amber-200"
                  : "border-white/10 bg-white/5 text-text-muted hover:bg-white/10"
              }`}
              title="Activer le mode debug pour diagnostiquer les tables vides"
            >
              Debug {tablesDebugEnabled ? "ON" : "OFF"}
            </button>
          </div>
          {tablesLoading ? <div className="p-4 text-text-muted text-sm">Chargement…</div> : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ul className="divide-y divide-white/5">
                {tables.map((table, i) => (
                  <motion.li key={table.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <div className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${selectedTable?.id === table.id ? "bg-accent-violet/15 border-l-2 border-accent-violet" : "text-text-muted hover:bg-white/5"}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedTable(table)}
                        className={`min-w-0 flex-1 text-left truncate ${selectedTable?.id === table.id ? "text-accent-violet" : "text-text-muted hover:text-text-primary"}`}
                      >
                        {table.name}
                      </button>
                      {selectedBase && (
                        <a
                          href={`https://airtable.com/${encodeURIComponent(selectedBase.id)}/${encodeURIComponent(table.id)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-xs text-text-muted hover:text-accent-violet"
                          title="Ouvrir la table dans Airtable"
                        >
                          ↗
                        </a>
                      )}
                    </div>
                  </motion.li>
                ))}
              </ul>
              {tables.length === 0 && !tablesLoading ? (
                <div className="p-3 text-xs text-text-muted">
                  Aucune table trouvée pour cette base.
                </div>
              ) : null}
              {tablesDebugEnabled && tablesDebugText ? (
                <div className="p-3 border-t border-white/10">
                  <p className="text-[11px] text-text-dim mb-1">Diagnostic tables (debug)</p>
                  <textarea
                    readOnly
                    value={tablesDebugText}
                    className="w-full min-h-[140px] rounded-lg border border-accent-amber/30 bg-black/30 p-2 text-[11px] font-mono text-text-primary focus:outline-none"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
        <div className="glass-strong rounded-xl border border-white/10 overflow-hidden card-glow flex flex-col min-h-0">
          <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap shrink-0">
            <div>
              <h2 className="font-semibold text-text-primary text-sm">Enregistrements</h2>
              {selectedTable && <p className="text-xs text-text-muted mt-0.5">{selectedTable.name}</p>}
            </div>
            {selectedBase && selectedTable && (
              <button
                type="button"
                onClick={() => { setCreateOpen(true); setFormError(null); setEditRecord(null); }}
                className="px-3 py-1.5 rounded-lg bg-accent-cyan/20 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/30"
              >
                Créer un enregistrement
              </button>
            )}
          </div>
          {recordsLoading ? <div className="p-4 text-text-muted text-sm">Chargement…</div> : records.length === 0 ? <div className="p-4 text-text-muted text-sm">{selectedTable ? "Aucun enregistrement." : "Sélectionnez une base et une table."}</div> : (
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              <AnimatePresence mode="popLayout">
                {records.slice(0, 15).map((rec: AirtableRecordRow, i) => (
                  <motion.div key={rec.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-2 text-xs flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-text-dim font-mono mb-1">{rec.id}</div>
                      <div className="text-text-primary space-y-0.5">
                        {Object.entries(rec.fields).slice(0, 4).map(([k, v]) => (
                          <div key={k} className="truncate"><span className="text-text-muted">{k}:</span> {typeof v === "object" ? JSON.stringify(v) : String(v)}</div>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEditRecord(rec); setCreateOpen(false); setFormError(null); }}
                      className="shrink-0 px-2 py-1 rounded bg-white/10 text-text-muted hover:text-accent-violet text-xs"
                    >
                      Modifier
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Modal Créer / Modifier enregistrement */}
      <AnimatePresence>
        {(createOpen || editRecord) && selectedBase && selectedTable && (
          <RecordFormModal
            baseId={selectedBase.id}
            tableId={selectedTable.id}
            record={editRecord}
            onClose={() => { setCreateOpen(false); setEditRecord(null); setFormError(null); }}
            onSuccess={() => { setCreateOpen(false); setEditRecord(null); reloadRecords(); }}
            loading={submitLoading}
            setLoading={setSubmitLoading}
            error={formError}
            setError={setFormError}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RecordFormModal({
  baseId,
  tableId,
  record,
  onClose,
  onSuccess,
  loading,
  setLoading,
  error,
  setError,
}: {
  baseId: string;
  tableId: string;
  record: AirtableRecordRow | null;
  onClose: () => void;
  onSuccess: () => void;
  loading: boolean;
  setLoading: (b: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const isEdit = !!record;
  const [fields, setFields] = useState<{ key: string; value: string }[]>(() =>
    record ? Object.entries(record.fields).map(([k, v]) => ({ key: k, value: typeof v === "object" ? JSON.stringify(v) : String(v) })) : [{ key: "", value: "" }]
  );

  const addRow = () => setFields((f) => [...f, { key: "", value: "" }]);
  const updateRow = (i: number, key: string, value: string) => {
    setFields((f) => f.map((r, j) => (j === i ? { key, value } : r)));
  };
  const removeRow = (i: number) => setFields((f) => f.filter((_, j) => j !== i));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const obj: Record<string, string> = {};
    fields.forEach(({ key, value }) => {
      if (key.trim()) obj[key.trim()] = value;
    });
    if (Object.keys(obj).length === 0) {
      setError("Ajoutez au moins un champ.");
      return;
    }
    setLoading(true);
    setError(null);
    if (isEdit) {
      fetchBackend(`/api/airtable/bases/${baseId}/tables/${tableId}/records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: obj }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          onSuccess();
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
        .finally(() => setLoading(false));
    } else {
      fetchBackend(`/api/airtable/bases/${baseId}/tables/${tableId}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: obj }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          onSuccess();
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
        .finally(() => setLoading(false));
    }
  };

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
        className="w-full max-w-lg glass-strong rounded-2xl border border-white/10 p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-text-primary mb-4">{isEdit ? "Modifier l'enregistrement" : "Créer un enregistrement"}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={row.key}
                onChange={(e) => updateRow(i, e.target.value, row.value)}
                placeholder="Nom du champ"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm"
              />
              <input
                type="text"
                value={row.value}
                onChange={(e) => updateRow(i, row.key, e.target.value)}
                placeholder="Valeur"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm"
              />
              <button type="button" onClick={() => removeRow(i)} className="px-2 text-text-muted hover:text-accent-rose">×</button>
            </div>
          ))}
          <button type="button" onClick={addRow} className="text-sm text-accent-cyan hover:underline">+ Ajouter un champ</button>
          {error && <p className="text-sm text-accent-rose">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 text-text-primary text-sm">Annuler</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-accent-cyan/20 text-accent-cyan text-sm font-medium disabled:opacity-50">{loading ? "Envoi…" : isEdit ? "Enregistrer" : "Créer"}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
