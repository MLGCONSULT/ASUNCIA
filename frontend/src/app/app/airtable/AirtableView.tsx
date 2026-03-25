"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type FormEvent,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { fetchBackend } from "@/lib/api";
import { buildAssistantPromptUrl } from "@/lib/assistant-intents";

type Base = { id: string; name: string; permissionLevel?: string; isFavorite?: boolean };
type AirtableField = { id: string; name: string; type?: string };
type Table = { id: string; name: string; description?: string; fields?: AirtableField[] };
type AirtableRecordRow = { id: string; createdTime?: string; fields: Record<string, unknown> };

type Props = {
  hasAirtable: boolean;
};

type RefreshRecordsOpts = {
  cursor?: string | null;
  append?: boolean;
  setNextCursor?: (c: string | null) => void;
  sortFieldId?: string | null;
  sortDirection?: "asc" | "desc";
  setTotalRecordCount?: (n: number | null) => void;
};

const FIELD_ID_RE = /^fld[A-Za-z0-9]{14}$/;

function refreshRecords(
  baseId: string,
  tableId: string,
  setRecords: Dispatch<SetStateAction<AirtableRecordRow[]>>,
  setRecordFieldNameMap: Dispatch<SetStateAction<Record<string, string>>>,
  setRecordsLoading: (b: boolean) => void,
  setError: (e: string | null) => void,
  opts?: RefreshRecordsOpts,
) {
  setRecordsLoading(true);
  const qs = new URLSearchParams();
  qs.set("pageSize", "100");
  if (opts?.cursor) qs.set("cursor", opts.cursor);
  if (opts?.sortFieldId && FIELD_ID_RE.test(opts.sortFieldId)) {
    qs.set("sortFieldId", opts.sortFieldId);
    qs.set("sortDirection", opts.sortDirection === "desc" ? "desc" : "asc");
  }
  const url = `/api/airtable/bases/${baseId}/tables/${tableId}/records?${qs.toString()}`;
  fetchBackend(url)
    .then((r) => r.json())
    .then((data) => {
      if (data.error) throw new Error(data.error);
      const rows = Array.isArray(data.records)
        ? (data.records as Array<Record<string, unknown>>).map((row) => {
            const rawFields =
              row && typeof row === "object"
                ? ((row.cellValuesByFieldName as unknown) ??
                  (row.valuesByFieldName as unknown) ??
                  (row.fields as unknown) ??
                  (row.cellValuesByFieldId as unknown) ??
                  (row.valuesByFieldId as unknown) ??
                  (row.values as unknown))
                : undefined;
            const fields =
              rawFields && typeof rawFields === "object" && !Array.isArray(rawFields)
                ? (rawFields as Record<string, unknown>)
                : {};
            return {
              id: typeof row?.id === "string" ? row.id : crypto.randomUUID(),
              createdTime:
                typeof row?.createdTime === "string" ? row.createdTime : undefined,
              fields,
            } as AirtableRecordRow;
          })
        : [];
      const incomingMap =
        data?.fieldMap && typeof data.fieldMap === "object" && !Array.isArray(data.fieldMap)
          ? (data.fieldMap as Record<string, string>)
          : {};
      if (!opts?.append) {
        setRecordFieldNameMap(incomingMap);
      } else {
        setRecordFieldNameMap((prev) => ({ ...prev, ...incomingMap }));
      }
      if (opts?.setNextCursor) {
        opts.setNextCursor(
          typeof data.nextCursor === "string" && data.nextCursor.length > 0 ? data.nextCursor : null,
        );
      }
      if (opts?.setTotalRecordCount && !opts?.append) {
        const tc = (data as { totalRecordCount?: unknown }).totalRecordCount;
        opts.setTotalRecordCount(typeof tc === "number" && Number.isFinite(tc) ? tc : null);
      }
      if (opts?.append) {
        setRecords((prev) => [...prev, ...rows]);
      } else {
        setRecords(rows);
      }
    })
    .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
    .finally(() => setRecordsLoading(false));
}

function toDatetimeLocalValue(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isLikelyImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
}

function extractAttachmentUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      return typeof obj.url === "string" ? obj.url : null;
    })
    .filter((x): x is string => !!x);
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
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [records, setRecords] = useState<AirtableRecordRow[]>([]);
  const [recordsNextCursor, setRecordsNextCursor] = useState<string | null>(null);
  const [recordFieldNameMap, setRecordFieldNameMap] = useState<Record<string, string>>({});
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [baseSearchInput, setBaseSearchInput] = useState("");
  const [baseSearchHint, setBaseSearchHint] = useState<string | null>(null);
  const [baseSearchOpen, setBaseSearchOpen] = useState(false);
  const [recommendedBaseId, setRecommendedBaseId] = useState<string | null>(null);
  const [searchingBases, setSearchingBases] = useState(false);
  const [recordsTotalCount, setRecordsTotalCount] = useState<number | null>(null);
  const [sortFieldId, setSortFieldId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [detailRecord, setDetailRecord] = useState<AirtableRecordRow | null>(null);
  const [schemaPreview, setSchemaPreview] = useState<string | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AirtableRecordRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const selectedTableFieldMap = useMemo(() => {
    const map = new Map<string, AirtableField>();
    for (const f of selectedTable?.fields ?? []) {
      map.set(f.id, f);
      map.set(f.name, f);
    }
    for (const [id, name] of Object.entries(recordFieldNameMap)) {
      if (typeof name === "string" && name.trim()) {
        map.set(id, { id, name });
      }
    }
    return map;
  }, [selectedTable, recordFieldNameMap]);

  const selectedTableResolvedFields = useMemo(() => {
    const schemaFields = selectedTable?.fields ?? [];
    if (schemaFields.length > 0) return schemaFields;

    const discovered = new Map<string, AirtableField>();
    for (const rec of records) {
      for (const key of Object.keys(rec.fields ?? {})) {
        if (!discovered.has(key)) {
          discovered.set(key, { id: key, name: key });
        }
      }
      if (discovered.size >= 30) break;
    }
    return Array.from(discovered.values());
  }, [selectedTable, records]);

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
      setSelectedTable(null);
      return;
    }
    setTablesLoading(true);
    setRecords([]);
    setSelectedTable(null);
    fetchBackend(`/api/airtable/bases/${selectedBase.id}/tables`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTables(data.tables ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setTablesLoading(false));
  }, [selectedBase]);

  const reloadRecords = useCallback(() => {
    if (!selectedBase || !selectedTable) return;
    refreshRecords(
      selectedBase.id,
      selectedTable.id,
      setRecords,
      setRecordFieldNameMap,
      setRecordsLoading,
      setError,
      {
        setNextCursor: setRecordsNextCursor,
        sortFieldId,
        sortDirection,
        setTotalRecordCount: setRecordsTotalCount,
      },
    );
  }, [selectedBase, selectedTable, sortFieldId, sortDirection]);

  const loadMoreRecords = useCallback(() => {
    if (!selectedBase || !selectedTable || !recordsNextCursor) return;
    refreshRecords(
      selectedBase.id,
      selectedTable.id,
      setRecords,
      setRecordFieldNameMap,
      setRecordsLoading,
      setError,
      {
        cursor: recordsNextCursor,
        append: true,
        setNextCursor: setRecordsNextCursor,
        sortFieldId,
        sortDirection,
      },
    );
  }, [selectedBase, selectedTable, recordsNextCursor, sortFieldId, sortDirection]);

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

  const handleSearchBases = useCallback(() => {
    const q = baseSearchInput.trim();
    if (!q || !hasAirtable) return;
    setSearchingBases(true);
    setError(null);
    setBaseSearchHint(null);
    fetchBackend(`/api/airtable/bases/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const list = Array.isArray(data.bases) ? data.bases : [];
        setBases(
          list.map((b: Record<string, unknown>) => ({
            id: typeof b.id === "string" ? b.id : "",
            name: typeof b.name === "string" ? b.name : "Sans nom",
            ...(typeof b.permissionLevel === "string" ? { permissionLevel: b.permissionLevel } : {}),
            ...(typeof b.isFavorite === "boolean" ? { isFavorite: b.isFavorite } : {}),
          })),
        );
        setBaseSearchHint(typeof data.hint === "string" ? data.hint : null);
        setRecommendedBaseId(typeof data.recommendedBaseId === "string" ? data.recommendedBaseId : null);
        setSelectedBase(null);
        setSelectedTable(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setSearchingBases(false));
  }, [baseSearchInput, hasAirtable]);

  const reloadAllBases = useCallback(() => {
    if (!hasAirtable) return;
    setLoading(true);
    setError(null);
    setBaseSearchHint(null);
    setRecommendedBaseId(null);
    setBaseSearchInput("");
    fetchBackend("/api/airtable/bases")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBases(data.bases ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [hasAirtable]);

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
    setSortFieldId(null);
    setSortDirection("asc");
  }, [selectedBase?.id]);

  useEffect(() => {
    if (baseSearchHint) setBaseSearchOpen(true);
  }, [baseSearchHint]);

  useEffect(() => {
    setSchemaPreview(null);
  }, [selectedTable?.id]);

  const loadSchemaPreview = useCallback(async () => {
    if (!selectedBase || !selectedTable) return;
    const ids = (selectedTable.fields ?? []).map((f) => f.id).filter((id) => FIELD_ID_RE.test(id));
    if (ids.length === 0) {
      setError("Impossible de charger le schéma : aucun identifiant de champ connu.");
      return;
    }
    setSchemaLoading(true);
    setError(null);
    try {
      const r = await fetchBackend(`/api/airtable/bases/${selectedBase.id}/table-schema`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables: [{ tableId: selectedTable.id, fieldIds: ids }] }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setSchemaPreview(JSON.stringify(data, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSchemaLoading(false);
    }
  }, [selectedBase, selectedTable]);

  useEffect(() => {
    if (!selectedBase || !selectedTable) {
      setRecords([]);
      setRecordFieldNameMap({});
      setRecordsNextCursor(null);
      setRecordsTotalCount(null);
      return;
    }
    setRecordsNextCursor(null);
    refreshRecords(
      selectedBase.id,
      selectedTable.id,
      setRecords,
      setRecordFieldNameMap,
      setRecordsLoading,
      setError,
      {
        setNextCursor: setRecordsNextCursor,
        sortFieldId,
        sortDirection,
        setTotalRecordCount: setRecordsTotalCount,
      },
    );
  }, [selectedBase, selectedTable, sortFieldId, sortDirection]);

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
          <div className="p-3 border-b border-white/10 shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
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
            <button
              type="button"
              onClick={() => setBaseSearchOpen((o) => !o)}
              className="text-[11px] text-text-muted hover:text-text-primary w-full text-left"
            >
              {baseSearchOpen ? "Replier la recherche" : "Rechercher une base…"}
            </button>
            {baseSearchOpen ? (
              <div className="flex gap-1.5">
                <input
                  type="search"
                  value={baseSearchInput}
                  onChange={(e) => setBaseSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchBases()}
                  placeholder="Nom de la base…"
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-text-primary text-xs placeholder:text-text-dim"
                />
                <button
                  type="button"
                  onClick={handleSearchBases}
                  disabled={searchingBases || !baseSearchInput.trim()}
                  className="px-2 py-1.5 rounded-lg bg-accent-cyan/15 text-accent-cyan text-xs font-medium disabled:opacity-50"
                >
                  {searchingBases ? "…" : "Rechercher"}
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={reloadAllBases}
              className="text-[11px] text-text-muted hover:text-text-primary"
            >
              Afficher toutes les bases
            </button>
            {recommendedBaseId && bases.some((b) => b.id === recommendedBaseId) ? (
              <button
                type="button"
                onClick={() => {
                  const b = bases.find((x) => x.id === recommendedBaseId);
                  if (b) setSelectedBase(b);
                }}
                className="text-[11px] text-accent-cyan hover:underline w-full text-left"
              >
                Ouvrir la base suggérée
              </button>
            ) : null}
            {baseSearchHint ? (
              <p className="text-[11px] text-text-dim leading-snug">{baseSearchHint}</p>
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
                    {base.isFavorite ? <span className="mr-1 text-amber-400/90" title="Favori">★</span> : null}
                    {base.name}
                  </button>
                  {base.permissionLevel === "read" || base.permissionLevel === "none" ? (
                    <span className="shrink-0 text-[9px] uppercase tracking-wide px-1 rounded bg-white/10 text-text-dim" title="Accès en lecture seule">
                      Lecture seule
                    </span>
                  ) : null}
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
          <div className="p-3 border-b border-white/10 shrink-0">
            <div>
              <h2 className="font-semibold text-text-primary text-sm">Tables</h2>
              {selectedBase && <p className="text-xs text-text-muted mt-0.5">{selectedBase.name}</p>}
            </div>
          </div>
          {tablesLoading ? <div className="p-4 text-text-muted text-sm">Chargement…</div> : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ul className="divide-y divide-white/5">
                {tables.map((table, i) => (
                  <motion.li key={table.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <div className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${selectedTable?.id === table.id ? "bg-accent-violet/15 border-l-2 border-accent-violet" : "text-text-muted hover:bg-white/5"}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setSortFieldId(null);
                          setSortDirection("asc");
                          setSelectedTable(table);
                        }}
                        className={`min-w-0 flex-1 text-left truncate ${selectedTable?.id === table.id ? "text-accent-violet" : "text-text-muted hover:text-text-primary"}`}
                        title={table.description ? table.description : undefined}
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
            </div>
          )}
        </div>
        <div className="glass-strong rounded-xl border border-white/10 overflow-hidden card-glow flex flex-col min-h-0">
          <div className="p-3 border-b border-white/10 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h2 className="font-semibold text-text-primary text-sm">
                  Enregistrements
                  {selectedTable && recordsTotalCount != null ? (
                    <span className="ml-2 font-normal text-text-muted">
                      ({records.length} affiché{records.length > 1 ? "s" : ""} sur {recordsTotalCount})
                    </span>
                  ) : selectedTable ? (
                    <span className="ml-2 font-normal text-text-muted">({records.length})</span>
                  ) : null}
                </h2>
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
            {selectedBase && selectedTable ? (
              <p className="text-[11px] text-text-dim leading-snug">
                La suppression des enregistrements n&apos;est pas proposée dans cette application. Pour supprimer des lignes, utilisez{" "}
                <a href={`https://airtable.com/${encodeURIComponent(selectedBase.id)}/${encodeURIComponent(selectedTable.id)}`} target="_blank" rel="noreferrer" className="text-accent-cyan hover:underline">
                  l&apos;interface Airtable
                </a>
                .
              </p>
            ) : null}
            {selectedBase && selectedTable && selectedTableResolvedFields.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <label className="text-text-muted flex items-center gap-1.5">
                  <span className="text-text-dim">Trier par</span>
                  <select
                    value={sortFieldId ?? ""}
                    onChange={(e) => setSortFieldId(e.target.value.length > 0 ? e.target.value : null)}
                    className="rounded-lg bg-white/5 border border-white/10 text-text-primary px-2 py-1 max-w-[10rem]"
                  >
                    <option value="">Ordre par défaut</option>
                    {selectedTableResolvedFields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-text-muted flex items-center gap-1.5">
                  <span className="text-text-dim">Sens</span>
                  <select
                    value={sortDirection}
                    onChange={(e) => setSortDirection(e.target.value === "desc" ? "desc" : "asc")}
                    className="rounded-lg bg-white/5 border border-white/10 text-text-primary px-2 py-1"
                    disabled={!sortFieldId}
                  >
                    <option value="asc">Croissant</option>
                    <option value="desc">Décroissant</option>
                  </select>
                </label>
              </div>
            ) : null}
            <details className="rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5 text-[11px] text-text-muted">
              <summary className="cursor-pointer select-none text-text-dim">Avancé — schéma des champs</summary>
              <div className="mt-2 space-y-2">
                <button
                  type="button"
                  onClick={loadSchemaPreview}
                  disabled={schemaLoading || !selectedTable}
                  className="px-2 py-1 rounded bg-white/10 text-text-primary hover:bg-white/15 disabled:opacity-50"
                >
                  {schemaLoading ? "Chargement…" : "Charger le JSON du schéma"}
                </button>
                {schemaPreview ? (
                  <pre className="text-[10px] leading-relaxed overflow-auto max-h-40 rounded border border-white/10 bg-black/20 p-2 font-mono text-text-muted">
                    {schemaPreview}
                  </pre>
                ) : (
                  <p className="text-text-dim">Utile pour vérifier les types et options (select, etc.).</p>
                )}
              </div>
            </details>
          </div>
          {recordsLoading ? <div className="p-4 text-text-muted text-sm">Chargement…</div> : records.length === 0 ? <div className="p-4 text-text-muted text-sm">{selectedTable ? "Aucun enregistrement." : "Sélectionnez une base et une table."}</div> : (
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              <AnimatePresence mode="popLayout">
                {records.map((rec: AirtableRecordRow, i) => (
                  <motion.div key={rec.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-2 text-xs flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-text-dim font-mono mb-1">{rec.id}</div>
                      <div className="text-text-primary space-y-0.5">
                        {Object.entries(rec.fields ?? {}).slice(0, 6).map(([k, v]) => (
                          <div key={k} className="truncate">
                            <span className="text-text-muted">
                              {selectedTableFieldMap.get(k)?.name ?? k}:
                            </span>{" "}
                            {renderAirtableCellValue(v)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => { setDetailRecord(rec); setFormError(null); }}
                        className="px-2 py-1 rounded bg-white/10 text-text-muted hover:text-accent-cyan text-xs"
                      >
                        Détail
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditRecord(rec); setCreateOpen(false); setFormError(null); }}
                        className="px-2 py-1 rounded bg-white/10 text-text-muted hover:text-accent-violet text-xs"
                      >
                        Modifier
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {recordsNextCursor ? (
                <div className="p-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={loadMoreRecords}
                    disabled={recordsLoading}
                    className="w-full py-2 rounded-lg bg-white/5 text-text-muted text-xs hover:bg-white/10 disabled:opacity-50"
                  >
                    {recordsLoading ? "Chargement…" : "Charger la suite"}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {detailRecord ? (
          <RecordDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
        ) : null}
      </AnimatePresence>

      {/* Modal Créer / Modifier enregistrement */}
      <AnimatePresence>
        {(createOpen || editRecord) && selectedBase && selectedTable && (
          <RecordFormModal
            baseId={selectedBase.id}
            tableId={selectedTable.id}
            tableFields={selectedTableResolvedFields}
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

function RecordDetailModal({
  record,
  onClose,
}: {
  record: AirtableRecordRow;
  onClose: () => void;
}) {
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
        <h3 className="font-semibold text-text-primary mb-2">Détail de l&apos;enregistrement</h3>
        <p className="font-mono text-[11px] text-text-dim break-all mb-3">{record.id}</p>
        <pre className="text-xs overflow-auto max-h-[60vh] rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-text-muted whitespace-pre-wrap">
          {JSON.stringify(record.fields ?? {}, null, 2)}
        </pre>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 px-4 py-2 rounded-lg bg-white/10 text-text-primary text-sm"
        >
          Fermer
        </button>
      </motion.div>
    </motion.div>
  );
}

function formatAirtableCellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (typeof value[0] === "object" && value[0] !== null) {
      const names = value
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const obj = item as Record<string, unknown>;
          if (typeof obj.name === "string") return obj.name;
          if (typeof obj.url === "string") return "Pièce jointe";
          return null;
        })
        .filter((x): x is string => !!x);
      if (names.length > 0) return names.join(", ");
    }
    return `${value.length} élément(s)`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.url === "string") return "Pièce jointe";
    return JSON.stringify(obj);
  }
  return String(value);
}

function renderAirtableCellValue(value: unknown): ReactNode {
  const attachmentUrls = extractAttachmentUrls(value);
  if (attachmentUrls.length > 0) {
    return (
      <div className="space-y-1">
        <p className="text-text-primary">{attachmentUrls.length} pièce(s) jointe(s)</p>
        <div className="flex flex-wrap gap-1.5">
          {attachmentUrls.slice(0, 3).map((url, idx) => (
            <a
              key={`${url}-${idx}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block w-12 h-12 rounded-md overflow-hidden border border-white/10 bg-black/20"
              title="Ouvrir la pièce jointe"
            >
              {isLikelyImageUrl(url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="Pièce jointe" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-[10px] text-text-muted">Fichier</span>
              )}
            </a>
          ))}
        </div>
      </div>
    );
  }
  return <span>{formatAirtableCellValue(value)}</span>;
}

function formatFieldValueForInput(type: string | undefined, value: unknown): string {
  if (value == null) return "";
  if (type === "checkbox") return Boolean(value) ? "true" : "false";
  if (type === "dateTime" && typeof value === "string") return toDatetimeLocalValue(value);
  if (type === "multipleAttachments") return extractAttachmentUrls(value).join("\n");
  if (type === "multipleSelects" && Array.isArray(value)) {
    const names = value
      .map((v) => {
        if (typeof v === "string") return v;
        if (v && typeof v === "object" && typeof (v as { name?: unknown }).name === "string") {
          return (v as { name: string }).name;
        }
        return null;
      })
      .filter((x): x is string => !!x);
    return names.join(", ");
  }
  if (typeof value === "object" && value !== null && "name" in (value as Record<string, unknown>)) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function parseInputValueByType(type: string | undefined, raw: string): unknown {
  const value = raw.trim();
  if (value.length === 0) return undefined;
  switch (type) {
    case "checkbox":
      return value === "true" || value === "1" || value.toLowerCase() === "oui";
    case "number":
    case "currency":
    case "percent":
    case "rating": {
      const n = Number(value);
      return Number.isFinite(n) ? n : value;
    }
    case "multipleSelects":
      return value.split(",").map((x) => x.trim()).filter(Boolean);
    case "multipleAttachments": {
      const urls = value.split(/\r?\n|,/g).map((x) => x.trim()).filter(Boolean);
      return urls.map((url) => ({ url }));
    }
    case "date":
      return value;
    case "dateTime": {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? value : d.toISOString();
    }
    default:
      return value;
  }
}

function getFieldGroup(type: string | undefined): "principal" | "date" | "number" | "choice" | "media" | "other" {
  if (!type || type === "singleLineText" || type === "multilineText" || type === "email" || type === "phoneNumber" || type === "url") {
    return "principal";
  }
  if (type === "date" || type === "dateTime") return "date";
  if (type === "number" || type === "currency" || type === "percent" || type === "rating") return "number";
  if (type === "singleSelect" || type === "multipleSelects" || type === "checkbox") return "choice";
  if (type === "multipleAttachments") return "media";
  return "other";
}

function getFieldPlaceholder(type: string | undefined): string {
  if (type === "multipleSelects") return "Option1, Option2";
  if (type === "singleSelect") return "Une option";
  if (type === "date") return "AAAA-MM-JJ";
  if (type === "dateTime") return "Date et heure";
  if (type === "email") return "contact@exemple.com";
  if (type === "phoneNumber") return "+33...";
  if (type === "url") return "https://...";
  return "Valeur";
}

function RecordFormModal({
  baseId,
  tableId,
  tableFields,
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
  tableFields: AirtableField[];
  record: AirtableRecordRow | null;
  onClose: () => void;
  onSuccess: () => void;
  loading: boolean;
  setLoading: (b: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const isEdit = !!record;
  const [fields, setFields] = useState<{ key: string; label: string; type?: string; value: string }[]>(() => {
    if (tableFields.length > 0) {
      return tableFields.map((f) => {
        const existing = record?.fields?.[f.name] ?? record?.fields?.[f.id];
        return {
          key: f.name,
          label: f.name,
          type: f.type,
          value: formatFieldValueForInput(f.type, existing),
        };
      });
    }
    return record
      ? Object.entries(record.fields ?? {}).map(([k, v]) => ({
          key: k,
          label: k,
          type: undefined,
          value: typeof v === "object" ? JSON.stringify(v) : String(v),
        }))
      : [{ key: "", label: "", type: undefined, value: "" }];
  });
  const [typecast, setTypecast] = useState(false);
  const [upsertMergeFieldIds, setUpsertMergeFieldIds] = useState("");

  const addRow = () => setFields((f) => [...f, { key: "", label: "", type: undefined, value: "" }]);
  const updateRow = (i: number, key: string, value: string) => {
    setFields((f) => f.map((r, j) => (j === i ? { ...r, key, label: key, value } : r)));
  };
  const removeRow = (i: number) => setFields((f) => f.filter((_, j) => j !== i));

  const filledCount = useMemo(
    () => fields.filter((f) => f.value.trim().length > 0 || (f.type === "checkbox" && f.value === "true")).length,
    [fields],
  );

  const groupedIndexes = useMemo(() => {
    const groups = new Map<string, number[]>();
    fields.forEach((field, index) => {
      const group = tableFields.length > 0 ? getFieldGroup(field.type) : "principal";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)?.push(index);
    });
    return groups;
  }, [fields, tableFields.length]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const obj: Record<string, unknown> = {};
    fields.forEach(({ key, type, value }) => {
      if (!key.trim()) return;
      const parsed = parseInputValueByType(type, value);
      if (parsed !== undefined) {
        obj[key.trim()] = parsed;
      }
    });
    if (Object.keys(obj).length === 0) {
      setError("Ajoutez au moins un champ.");
      return;
    }
    setLoading(true);
    setError(null);
    const buildPayload = () => {
      const payload: Record<string, unknown> = { fields: obj };
      if (typecast) payload.typecast = true;
      if (isEdit && upsertMergeFieldIds.trim()) {
        const ids = upsertMergeFieldIds
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter((id) => FIELD_ID_RE.test(id));
        if (ids.length > 0) payload.performUpsert = { fieldIdsToMergeOn: ids };
      }
      return payload;
    };
    if (isEdit) {
      fetchBackend(`/api/airtable/bases/${baseId}/tables/${tableId}/records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          onSuccess();
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
        .finally(() => setLoading(false));
    } else {
      const createPayload: Record<string, unknown> = { fields: obj };
      if (typecast) createPayload.typecast = true;
      fetchBackend(`/api/airtable/bases/${baseId}/tables/${tableId}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createPayload),
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
          {tableFields.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-text-muted flex items-center justify-between gap-2">
              <span>Colonnes detectees: remplis uniquement les champs utiles.</span>
              <span className="text-text-dim">
                {filledCount}/{fields.length} rempli(s)
              </span>
            </div>
          )}
          {Array.from(groupedIndexes.entries()).map(([group, indexes]) => {
            const title =
              group === "principal"
                ? "Texte et infos"
                : group === "date"
                  ? "Dates"
                  : group === "number"
                    ? "Numeriques"
                    : group === "choice"
                      ? "Options et statuts"
                      : group === "media"
                        ? "Pieces jointes"
                        : "Autres colonnes";
            return (
              <div key={group} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                <p className="text-xs font-medium text-text-muted">{title}</p>
                {indexes.map((i) => {
                  const row = fields[i];
                  return (
                    <div key={i} className="space-y-1.5">
                      <label className="block text-xs text-text-dim">
                        {tableFields.length > 0 ? (row.label || row.key) : "Nom de champ"}
                      </label>
                      <div className="flex gap-2">
                        {tableFields.length === 0 ? (
                          <input
                            type="text"
                            value={row.key}
                            onChange={(e) => updateRow(i, e.target.value, row.value)}
                            placeholder="Nom du champ"
                            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm"
                          />
                        ) : null}
                        {row.type === "multipleAttachments" ? (
                          <textarea
                            value={row.value}
                            onChange={(e) => updateRow(i, row.key, e.target.value)}
                            placeholder="https://... (une URL par ligne)"
                            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm min-h-[68px]"
                          />
                        ) : row.type === "checkbox" ? (
                          <label className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={row.value === "true"}
                              onChange={(e) => updateRow(i, row.key, e.target.checked ? "true" : "false")}
                            />
                            {row.value === "true" ? "Active" : "Desactive"}
                          </label>
                        ) : (
                          <input
                            type={
                              row.type === "date"
                                ? "date"
                                : row.type === "dateTime"
                                  ? "datetime-local"
                                  : row.type === "number" || row.type === "currency" || row.type === "percent" || row.type === "rating"
                                    ? "number"
                                    : "text"
                            }
                            value={row.value}
                            onChange={(e) => updateRow(i, row.key, e.target.value)}
                            placeholder={getFieldPlaceholder(row.type)}
                            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm"
                          />
                        )}
                        {tableFields.length === 0 ? (
                          <button type="button" onClick={() => removeRow(i)} className="px-2 text-text-muted hover:text-accent-rose">×</button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {tableFields.length === 0 ? (
            <button type="button" onClick={addRow} className="text-sm text-accent-cyan hover:underline">+ Ajouter un champ</button>
          ) : null}
          <details className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
            <summary className="cursor-pointer text-text-muted select-none">Options avancées</summary>
            <div className="mt-2 space-y-2 text-text-muted">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={typecast}
                  onChange={(e) => setTypecast(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="text-text-primary font-medium">Typecast</span> — accepter des libellés (choix, liens…) comme dans l&apos;interface Airtable.
                </span>
              </label>
              {isEdit ? (
                <label className="block space-y-1">
                  <span className="text-text-dim">Fusion (upsert) : identifiants de champs <code className="text-[10px]">fld…</code>, séparés par des virgules</span>
                  <input
                    type="text"
                    value={upsertMergeFieldIds}
                    onChange={(e) => setUpsertMergeFieldIds(e.target.value)}
                    placeholder="fldXXXXXXXXXXXXXX, fldYYYYYYYYYYYYYY"
                    className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm font-mono"
                  />
                </label>
              ) : null}
            </div>
          </details>
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
