import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import {
  callAirtableMcpTool,
  isAirtableMcpConfigured,
  listAirtableMcpTools,
} from "../mcp/airtable-client";
import { parseMcpResultJson } from "../mcp/result";
import { MCP_ERROR_MESSAGES } from "../config/mcp";
import { createUserSupabaseFromRequest } from "../services/auth-context";
import {
  getAirtableConnectionStatus,
  getAirtableRuntimeAccess,
  type UserIntegrationContext,
} from "../services/integrations/airtable";

type AuthRequest = Request & { user?: { id: string } };

type AirtableBaseParams = { baseId: string };
type AirtableRecordParams = { baseId: string; tableId: string };
type AirtableRecordWithIdParams = { baseId: string; tableId: string; recordId: string };

type AirtableRecordsQuery = {
  maxRecords?: number | string;
  pageSize?: number | string;
  cursor?: string;
  /** Tri sur un champ (ID fld…) */
  sortFieldId?: string;
  /** asc | desc (défaut asc) */
  sortDirection?: string;
  /** IDs de champs séparés par des virgules pour limiter les colonnes retournées */
  fieldIds?: string;
};

const AIRTABLE_FIELD_ID = /^fld[A-Za-z0-9]{14}$/;

function extractFieldsPayload(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const o = body as Record<string, unknown>;
  if (o.fields && typeof o.fields === "object" && !Array.isArray(o.fields)) {
    return o.fields as Record<string, unknown>;
  }
  return o as Record<string, unknown>;
}

function parsePageSizeQuery(
  maxRecords: unknown,
  pageSize: unknown,
  defaultSize = 100,
): number | undefined {
  const raw = pageSize !== undefined && pageSize !== "" ? pageSize : maxRecords;
  if (raw === undefined || raw === "") return defaultSize;
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n) || n <= 0) return defaultSize;
  return Math.min(Math.floor(n), 8000);
}

function parseFieldIdsQuery(fieldIdsRaw: string | undefined): string[] | undefined {
  if (!fieldIdsRaw || typeof fieldIdsRaw !== "string" || !fieldIdsRaw.trim()) return undefined;
  const ids = fieldIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((id) => AIRTABLE_FIELD_ID.test(id));
  return ids.length > 0 ? ids : undefined;
}

function parseSortFromQuery(
  sortFieldId: string | undefined,
  sortDirection: string | undefined,
): Array<{ fieldId: string; direction: "asc" | "desc" }> | undefined {
  if (!sortFieldId || typeof sortFieldId !== "string" || !sortFieldId.trim()) return undefined;
  const fid = sortFieldId.trim();
  if (!AIRTABLE_FIELD_ID.test(fid)) return undefined;
  const dir = sortDirection?.toLowerCase() === "desc" ? "desc" : "asc";
  return [{ fieldId: fid, direction: dir }];
}

function extractTotalRecordCount(metadata: unknown): number | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const m = metadata as Record<string, unknown>;
  const n = m.totalRecordCount;
  if (typeof n === "number" && Number.isFinite(n)) return n;
  return undefined;
}

function extractWriteOptions(body: unknown): {
  typecast?: boolean;
  performUpsert?: { fieldIdsToMergeOn: string[] };
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const o = body as Record<string, unknown>;
  const typecast = o.typecast === true ? true : undefined;
  let performUpsert: { fieldIdsToMergeOn: string[] } | undefined;
  if (o.performUpsert && typeof o.performUpsert === "object" && !Array.isArray(o.performUpsert)) {
    const pu = o.performUpsert as Record<string, unknown>;
    const raw = pu.fieldIdsToMergeOn;
    if (Array.isArray(raw) && raw.every((x) => typeof x === "string")) {
      const ids = (raw as string[]).filter((id) => AIRTABLE_FIELD_ID.test(id));
      if (ids.length > 0) performUpsert = { fieldIdsToMergeOn: ids };
    }
  }
  return { typecast, performUpsert };
}

function mapFieldKeysToAirtableIds(
  tableFields: AirtableField[],
  payload: Record<string, unknown>,
): { mapped: Record<string, unknown>; unresolved: string[] } {
  const byName = new Map(tableFields.map((f) => [f.name.trim().toLowerCase(), f.id]));
  const mapped: Record<string, unknown> = {};
  const unresolved: string[] = [];
  for (const [key, val] of Object.entries(payload)) {
    const k = key.trim();
    if (!k) continue;
    if (AIRTABLE_FIELD_ID.test(k)) {
      mapped[k] = val;
      continue;
    }
    const id = byName.get(k.toLowerCase());
    if (id) mapped[id] = val;
    else unresolved.push(k);
  }
  return { mapped, unresolved };
}
type AirtableField = { id: string; name: string; type?: string };
type AirtableTable = { id: string; name: string; description?: string; fields?: AirtableField[] };

function normalizeBasesFromList(data: unknown): Array<{
  id: string;
  name: string;
  permissionLevel?: string;
  isFavorite?: boolean;
}> {
  const rows = pickBestArray(data, ["bases", "data", "items"], true);
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === "string" ? r.id : "";
      const name = typeof r.name === "string" ? r.name : "Sans nom";
      if (!id) return null;
      const permissionLevel = typeof r.permissionLevel === "string" ? r.permissionLevel : undefined;
      const isFavorite = typeof r.isFavorite === "boolean" ? r.isFavorite : undefined;
      return {
        id,
        name,
        ...(permissionLevel ? { permissionLevel } : {}),
        ...(isFavorite !== undefined ? { isFavorite } : {}),
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
}

function collectArraysByKeys(data: unknown, keys: string[], depth = 0): unknown[][] {
  if (depth > 4 || !data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const arrays: unknown[][] = [];
  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) arrays.push(value);
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      arrays.push(...collectArraysByKeys(value, keys, depth + 1));
    }
  }
  return arrays;
}

function isObjectWithId(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string";
}

function normalizeNamedItems(rows: unknown[]): { id: string; name: string }[] {
  return rows
    .map((row) => {
      if (!isObjectWithId(row)) return null;
      const nameCandidates = [
        (row as { name?: unknown }).name,
        (row as { title?: unknown }).title,
        (row as { table_name?: unknown }).table_name,
      ];
      const name = nameCandidates.find((x) => typeof x === "string");
      return {
        id: row.id as string,
        name: (name as string) || "Sans nom",
      };
    })
    .filter((x): x is { id: string; name: string } => !!x);
}

function pickBestArray(data: unknown, keys: string[], requireId = false): unknown[] {
  if (Array.isArray(data)) {
    if (!requireId) return data;
    return data.some((x) => isObjectWithId(x)) ? data : [];
  }
  const candidates = collectArraysByKeys(data, keys);
  if (candidates.length === 0) return [];
  if (!requireId) return candidates[0];
  const withId = candidates.find((arr) => arr.some((x) => isObjectWithId(x)));
  return withId ?? candidates[0];
}

function flattenObjectArrays(data: unknown, depth = 0): unknown[] {
  if (depth > 5 || !data || typeof data !== "object") return [];
  const out: unknown[] = [];
  if (Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) out.push(...value);
    else if (value && typeof value === "object") out.push(...flattenObjectArrays(value, depth + 1));
  }
  return out;
}

function extractFieldFromObject(
  obj: Record<string, unknown>,
  fallbackId?: string,
): { id: string; name: string; type?: string } | null {
  const idCandidate = typeof obj.id === "string" ? obj.id : fallbackId ?? "";
  const nameCandidate =
    (typeof obj.name === "string" && obj.name) ||
    (typeof obj.field_name === "string" && obj.field_name) ||
    (typeof obj.label === "string" && obj.label) ||
    "";
  const type = typeof obj.type === "string" ? obj.type : undefined;
  if (!idCandidate) return null;
  return { id: idCandidate, name: nameCandidate || idCandidate, type };
}

function normalizeFieldsFromUnknown(fieldsRaw: unknown): Array<{ id: string; name: string; type?: string }> {
  if (Array.isArray(fieldsRaw)) {
    return fieldsRaw
      .map((f) => (f && typeof f === "object" ? extractFieldFromObject(f as Record<string, unknown>) : null))
      .filter((x): x is { id: string; name: string; type?: string } => !!x);
  }
  if (fieldsRaw && typeof fieldsRaw === "object") {
    const entries = Object.entries(fieldsRaw as Record<string, unknown>);
    return entries
      .map(([k, v]) => (v && typeof v === "object" ? extractFieldFromObject(v as Record<string, unknown>, k) : null))
      .filter((x): x is { id: string; name: string; type?: string } => !!x);
  }
  return [];
}

function normalizeTablesFromUnknown(data: unknown): AirtableTable[] {
  const directRows = pickBestArray(data, ["tables", "data", "items"], false);
  const direct: AirtableTable[] = [];
  for (const row of directRows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const tableId =
      typeof r.id === "string" ? r.id : typeof r.tableId === "string" ? r.tableId : "";
    if (!tableId) continue;
    const nameCandidates = [r.name, r.title, r.table_name];
    const name = nameCandidates.find((x) => typeof x === "string");
    const fieldsRaw = r.fields;
    const fields = normalizeFieldsFromUnknown(fieldsRaw);
    const description = typeof r.description === "string" ? r.description : undefined;
    direct.push({
      id: tableId,
      name: (name as string) || "Sans nom",
      ...(description ? { description } : {}),
      fields,
    });
  }
  if (direct.length > 0) return direct;

  const deepRows = flattenObjectArrays(data).filter((x) => {
    if (!x || typeof x !== "object") return false;
    const o = x as Record<string, unknown>;
    return typeof o.id === "string";
  });
  return normalizeNamedItems(deepRows);
}

function looksLikeAirtableId(value: string): boolean {
  return /^(fld|tbl|rec|app)[A-Za-z0-9]+$/.test(value);
}

function needsFieldNameEnrichment(
  tables: AirtableTable[],
): boolean {
  return tables.some((table) => {
    const fields = table.fields ?? [];
    if (fields.length === 0) return true;
    return fields.every((field) => !field.name || looksLikeAirtableId(field.name));
  });
}

function mergeTablesWithSchemaFields(
  baseTables: AirtableTable[],
  schemaTables: AirtableTable[],
): AirtableTable[] {
  const schemaById = new Map(schemaTables.map((table) => [table.id, table]));
  return baseTables.map((table) => {
    const schemaTable = schemaById.get(table.id);
    const schemaFields = schemaTable?.fields ?? [];
    const tableFields = table.fields ?? [];
    const shouldReplace =
      tableFields.length === 0 ||
      tableFields.every((field) => !field.name || looksLikeAirtableId(field.name));
    return {
      ...table,
      fields: shouldReplace && schemaFields.length > 0 ? schemaFields : tableFields,
    };
  });
}

function mapRecordFieldsToNames(
  records: unknown[],
  fieldMap: Map<string, string>,
): unknown[] {
  return records.map((record) => {
    if (!record || typeof record !== "object") return record;
    const row = record as Record<string, unknown>;
    const rawFields = row.fields;
    if (!rawFields || typeof rawFields !== "object" || Array.isArray(rawFields)) return record;
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawFields as Record<string, unknown>)) {
      const mappedKey = fieldMap.get(key) ?? key;
      mapped[mappedKey] = value;
    }
    return {
      ...row,
      fields: mapped,
    };
  });
}

function extractFieldMapFromUnknown(data: unknown, depth = 0, out = new Map<string, string>()): Map<string, string> {
  if (depth > 5 || !data || typeof data !== "object") return out;
  if (Array.isArray(data)) {
    for (const item of data) extractFieldMapFromUnknown(item, depth + 1, out);
    return out;
  }
  const obj = data as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (looksLikeAirtableId(key) && typeof value === "string" && value.trim().length > 0) {
      out.set(key, value.trim());
    }
    if (value && typeof value === "object") {
      const rec = value as Record<string, unknown>;
      const id = typeof rec.id === "string" ? rec.id : "";
      const name =
        (typeof rec.name === "string" && rec.name) ||
        (typeof rec.field_name === "string" && rec.field_name) ||
        (typeof rec.label === "string" && rec.label) ||
        "";
      if (id && name) out.set(id, name);
      extractFieldMapFromUnknown(value, depth + 1, out);
    }
  }
  return out;
}

@Controller("airtable")
export class AirtableController {
  private async callAirtableWithArgVariants(
    toolName: string,
    argVariants: Record<string, unknown>[],
    accessToken?: string,
  ) {
    let lastError: unknown = null;
    for (const args of argVariants) {
      try {
        return await callAirtableMcpTool(toolName, args, accessToken);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError ?? new Error(`Aucune variante d'arguments compatible pour ${toolName}.`);
  }

  private getUserContext(req: AuthRequest): UserIntegrationContext {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    return {
      supabase: createUserSupabaseFromRequest(req),
      userId: req.user.id,
    };
  }

  /** Mappe les noms de champs (ou fld…) vers les IDs attendus par le MCP officiel. */
  private async resolveFieldsForWrite(
    baseId: string,
    tableId: string,
    body: unknown,
    accessToken: string | undefined,
  ): Promise<Record<string, unknown>> {
    const payload = extractFieldsPayload(body);
    if (Object.keys(payload).length === 0) {
      throw new HttpException({ error: "Aucun champ à enregistrer." }, HttpStatus.BAD_REQUEST);
    }
    const { tables } = await this.listTablesWithToolFallback(baseId, accessToken);
    const table = tables.find((t) => t.id === tableId);
    const tf = table?.fields ?? [];
    if (tf.length === 0) {
      const allFldKeys = Object.keys(payload).every((k) => AIRTABLE_FIELD_ID.test(k.trim()));
      if (!allFldKeys) {
        throw new HttpException(
          {
            error:
              "Impossible de résoudre les champs : recharge la liste des tables ou utilise des IDs de champs (fld…).",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      return payload;
    }
    const { mapped, unresolved } = mapFieldKeysToAirtableIds(tf, payload);
    if (unresolved.length > 0) {
      throw new HttpException(
        {
          error: `Champs non reconnus : ${unresolved.join(", ")}. Utilise les noms affichés dans la table ou des IDs fld….`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return mapped;
  }

  private async listTablesWithToolFallback(baseId: string, accessToken?: string) {
    const attempts: Array<{ tool: string; args: Record<string, unknown> }> = [
      { tool: "list_tables_for_base", args: { baseId } },
      { tool: "list_tables", args: { base_id: baseId } },
      { tool: "list_tables", args: { baseId } },
      { tool: "list_tables", args: { id: baseId } },
      { tool: "get_base_schema", args: { base_id: baseId } },
      { tool: "get_base_schema", args: { baseId } },
      { tool: "describe_base", args: { base_id: baseId } },
      { tool: "describe_base", args: { baseId } },
    ];

    let availableTools: string[] = [];
    try {
      const list = await listAirtableMcpTools(accessToken);
      availableTools = Array.isArray((list as { tools?: unknown[] }).tools)
        ? ((list as { tools: Array<{ name?: string }> }).tools
            .map((t) => (typeof t?.name === "string" ? t.name : ""))
            .filter(Boolean) as string[])
        : [];
    } catch {
      // ignore listTools failures, we'll still try defaults
    }

    const filteredAttempts =
      availableTools.length > 0
        ? attempts.filter((a) => availableTools.includes(a.tool))
        : attempts;
    const finalAttempts = filteredAttempts.length > 0 ? filteredAttempts : attempts;

    let lastError: unknown = null;
    for (const attempt of finalAttempts) {
      try {
        const result = await callAirtableMcpTool(attempt.tool, attempt.args, accessToken);
        const data = parseMcpResultJson(result);
        let tables = normalizeTablesFromUnknown(data);
        if (tables.length > 0 && needsFieldNameEnrichment(tables)) {
          try {
            if (availableTools.length === 0 || availableTools.includes("get_table_schema")) {
              for (const t of tables) {
                const fieldIds = (t.fields ?? []).map((f) => f.id).filter((id) => AIRTABLE_FIELD_ID.test(id));
                if (!AIRTABLE_FIELD_ID.test(t.id) || fieldIds.length === 0) continue;
                const schemaResult = await callAirtableMcpTool(
                  "get_table_schema",
                  { baseId, tables: [{ tableId: t.id, fieldIds }] },
                  accessToken,
                );
                const schemaData = parseMcpResultJson(schemaResult);
                const schemaTables = normalizeTablesFromUnknown(schemaData);
                if (schemaTables.length > 0) {
                  tables = mergeTablesWithSchemaFields(tables, schemaTables);
                }
              }
            } else {
              const schemaAttempts = [
                { tool: "get_base_schema", args: { base_id: baseId } },
                { tool: "get_base_schema", args: { baseId } },
                { tool: "describe_base", args: { base_id: baseId } },
                { tool: "describe_base", args: { baseId } },
              ].filter((a) => availableTools.includes(a.tool));
              for (const schemaAttempt of schemaAttempts) {
                const schemaResult = await callAirtableMcpTool(schemaAttempt.tool, schemaAttempt.args, accessToken);
                const schemaData = parseMcpResultJson(schemaResult);
                const schemaTables = normalizeTablesFromUnknown(schemaData);
                if (schemaTables.length > 0) {
                  tables = mergeTablesWithSchemaFields(tables, schemaTables);
                  break;
                }
              }
            }
          } catch {
            // No-op: we keep the best data already retrieved.
          }
        }
        if (tables.length > 0) {
          return { tables, data, usedTool: attempt.tool, availableTools };
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (lastError) throw lastError;
    return { tables: [], data: {}, usedTool: "none", availableTools };
  }

  private async listRecordsWithToolFallback(
    baseId: string,
    tableId: string,
    opts: {
      pageSize?: number;
      cursor?: string;
      sort?: Array<{ fieldId: string; direction?: "asc" | "desc" }>;
      fieldIds?: string[];
    },
    accessToken?: string,
  ): Promise<{ records: unknown[]; raw: unknown; nextCursor?: string | null; metadata?: unknown }> {
    const { pageSize, cursor, sort, fieldIds } = opts;
    const attempts: Array<{ tool: string; args: Record<string, unknown> }> = [
      {
        tool: "list_records_for_table",
        args: {
          baseId,
          tableId,
          ...(pageSize ? { pageSize } : {}),
          ...(cursor ? { cursor } : {}),
          ...(sort && sort.length > 0 ? { sort } : {}),
          ...(fieldIds && fieldIds.length > 0 ? { fieldIds } : {}),
        },
      },
      {
        tool: "list_records",
        args: { base_id: baseId, table_id: tableId, max_records: pageSize },
      },
      { tool: "list_records", args: { baseId, tableId, maxRecords: pageSize } },
      { tool: "list_records", args: { base_id: baseId, tableId, maxRecords: pageSize } },
      {
        tool: "list_records",
        args: { baseId, table_id: tableId, max_records: pageSize },
      },
    ];

    let availableTools: string[] = [];
    try {
      const list = await listAirtableMcpTools(accessToken);
      availableTools = Array.isArray((list as { tools?: unknown[] }).tools)
        ? ((list as { tools: Array<{ name?: string }> }).tools
            .map((t) => (typeof t?.name === "string" ? t.name : ""))
            .filter(Boolean) as string[])
        : [];
    } catch {
      // ignore
    }

    const filteredAttempts =
      availableTools.length > 0
        ? attempts.filter((a) => availableTools.includes(a.tool))
        : attempts;
    const finalAttempts = filteredAttempts.length > 0 ? filteredAttempts : attempts;

    let lastError: unknown = null;
    for (const attempt of finalAttempts) {
      try {
        const result = await callAirtableMcpTool(attempt.tool, attempt.args, accessToken);
        const data = parseMcpResultJson(result);
        const nextCursor =
          data && typeof data === "object" && "nextCursor" in data && typeof (data as { nextCursor?: unknown }).nextCursor === "string"
            ? (data as { nextCursor: string }).nextCursor
            : null;
        const metadata =
          data && typeof data === "object" && "metadata" in data ? (data as { metadata?: unknown }).metadata : undefined;
        const fromStandard = pickBestArray(data, ["records", "data", "items"]);
        if (fromStandard.length > 0) {
          return { records: fromStandard, raw: data, nextCursor, metadata };
        }

        const special = (data as { records?: unknown[] }).records;
        if (Array.isArray(special) && special.length > 0) {
          return {
            raw: data,
            nextCursor,
            metadata,
            records: special.map((r) => {
            if (!r || typeof r !== "object") return r;
            const row = r as Record<string, unknown>;
            const fields =
              row.cellValuesByFieldName && typeof row.cellValuesByFieldName === "object"
                ? row.cellValuesByFieldName
                : row.fields && typeof row.fields === "object"
                  ? row.fields
                  : row.valuesByFieldName && typeof row.valuesByFieldName === "object"
                    ? row.valuesByFieldName
                    : row.cellValuesByFieldId && typeof row.cellValuesByFieldId === "object"
                      ? row.cellValuesByFieldId
                      : row.valuesByFieldId && typeof row.valuesByFieldId === "object"
                        ? row.valuesByFieldId
                        : row.values && typeof row.values === "object"
                          ? row.values
                          : {}
            return {
              id: row.id,
              createdTime: row.createdTime,
              fields: fields ?? {},
            };
            }),
          };
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (lastError) throw lastError;
    return { records: [], raw: null, nextCursor: null };
  }

  @Get("bases")
  async listBases(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAirtableMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.airtable }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const ctx = this.getUserContext(req);
      const runtime = await getAirtableRuntimeAccess(ctx);
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez votre compte Airtable pour accéder aux bases." },
          HttpStatus.FORBIDDEN,
        );
      }
      const result = await callAirtableMcpTool("list_bases", {}, runtime.accessToken);
      const data = parseMcpResultJson(result);
      return {
        bases: normalizeBasesFromList(data),
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("bases/search")
  async searchBases(@Req() req: AuthRequest, @Query("q") q?: string, @Query("searchQuery") searchQuery?: string) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAirtableMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.airtable }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    const query = String(q ?? searchQuery ?? "").trim();
    if (!query) {
      throw new HttpException({ error: "Paramètre q ou searchQuery requis." }, HttpStatus.BAD_REQUEST);
    }
    try {
      const ctx = this.getUserContext(req);
      const runtime = await getAirtableRuntimeAccess(ctx);
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez votre compte Airtable pour rechercher des bases." },
          HttpStatus.FORBIDDEN,
        );
      }
      const result = await callAirtableMcpTool("search_bases", { searchQuery: query }, runtime.accessToken);
      return parseMcpResultJson(result);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("bases/:baseId/table-schema")
  async getTableSchema(
    @Req() req: AuthRequest,
    @Param() params: AirtableBaseParams,
    @Body() body: { tables?: Array<{ tableId: string; fieldIds: string[] }> },
  ) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAirtableMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.airtable }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    const tables = Array.isArray(body?.tables) ? body.tables : [];
    if (tables.length === 0) {
      throw new HttpException({ error: "Body.tables requis (tableId + fieldIds)." }, HttpStatus.BAD_REQUEST);
    }
    try {
      const { baseId } = params;
      const runtime = await getAirtableRuntimeAccess(this.getUserContext(req));
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez votre compte Airtable pour accéder au schéma." },
          HttpStatus.FORBIDDEN,
        );
      }
      const result = await callAirtableMcpTool("get_table_schema", { baseId, tables }, runtime.accessToken);
      return parseMcpResultJson(result);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("bases/:baseId/tables")
  async listTables(
    @Req() req: AuthRequest,
    @Param() params: AirtableBaseParams,
  ) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAirtableMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.airtable }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { baseId } = params;
      const runtime = await getAirtableRuntimeAccess(this.getUserContext(req));
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez votre compte Airtable pour accéder aux tables." },
          HttpStatus.FORBIDDEN,
        );
      }
      const { tables } = await this.listTablesWithToolFallback(
        baseId,
        runtime.accessToken,
      );
      return {
        tables,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("bases/:baseId/tables/:tableId/records")
  async listRecords(
    @Req() req: AuthRequest,
    @Param() params: AirtableRecordParams,
    @Query() query: AirtableRecordsQuery,
  ) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAirtableMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.airtable }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { baseId, tableId } = params;
      const pageSize = parsePageSizeQuery(query.maxRecords, query.pageSize, 100);
      const cursor = typeof query.cursor === "string" && query.cursor.trim() ? query.cursor.trim() : undefined;
      const sort = parseSortFromQuery(query.sortFieldId, query.sortDirection);
      const fieldIds = parseFieldIdsQuery(query.fieldIds);
      const runtime = await getAirtableRuntimeAccess(this.getUserContext(req));
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez votre compte Airtable pour accéder aux enregistrements." },
          HttpStatus.FORBIDDEN,
        );
      }
      const recordsResult = await this.listRecordsWithToolFallback(
        baseId,
        tableId,
        { pageSize, cursor, sort, fieldIds },
        runtime.accessToken,
      );
      let normalizedRecords = Array.isArray(recordsResult.records) ? recordsResult.records : [];
      let fieldMap = new Map<string, string>();
      try {
        const { tables } = await this.listTablesWithToolFallback(baseId, runtime.accessToken);
        const table = tables.find((t) => t.id === tableId);
        fieldMap = new Map((table?.fields ?? []).map((f) => [f.id, f.name]));
        if (fieldMap.size === 0) {
          fieldMap = extractFieldMapFromUnknown(recordsResult.raw);
        }
        if (fieldMap.size > 0) {
          normalizedRecords = mapRecordFieldsToNames(normalizedRecords, fieldMap);
        }
      } catch {
        fieldMap = extractFieldMapFromUnknown(recordsResult.raw);
        if (fieldMap.size > 0) {
          normalizedRecords = mapRecordFieldsToNames(normalizedRecords, fieldMap);
        }
      }
      const totalRecordCount = extractTotalRecordCount(recordsResult.metadata);
      return {
        records: normalizedRecords,
        fieldMap: Object.fromEntries(fieldMap),
        nextCursor: recordsResult.nextCursor ?? null,
        metadata: recordsResult.metadata ?? null,
        ...(totalRecordCount !== undefined ? { totalRecordCount } : {}),
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("bases/:baseId/tables/:tableId/records")
  async createRecord(
    @Req() req: AuthRequest,
    @Param() params: AirtableRecordParams,
    @Body() body: unknown,
  ) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAirtableMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.airtable }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { baseId, tableId } = params;
      const runtime = await getAirtableRuntimeAccess(this.getUserContext(req));
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez votre compte Airtable pour créer des enregistrements." },
          HttpStatus.FORBIDDEN,
        );
      }
      const mappedFields = await this.resolveFieldsForWrite(baseId, tableId, body, runtime.accessToken);
      const writeOpts = extractWriteOptions(body);

      let availableTools: string[] = [];
      try {
        const list = await listAirtableMcpTools(runtime.accessToken);
        availableTools = Array.isArray((list as { tools?: unknown[] }).tools)
          ? ((list as { tools: Array<{ name?: string }> }).tools
              .map((t) => (typeof t?.name === "string" ? t.name : ""))
              .filter(Boolean) as string[])
          : [];
      } catch {
        // Ignore list tools failure and try defaults.
      }

      const tc = writeOpts.typecast ? { typecast: true as const } : {};
      const attempts: Array<{ tool: string; args: Record<string, unknown>[] }> = [
        {
          tool: "create_records_for_table",
          args: [{ baseId, tableId, records: [{ fields: mappedFields }], ...tc }],
        },
        {
          tool: "create_records",
          args: [
            { base_id: baseId, table_id: tableId, records: [{ fields: mappedFields }], ...tc },
            { baseId, tableId, records: [{ fields: mappedFields }], ...tc },
            { base_id: baseId, tableId, records: [{ fields: mappedFields }], ...tc },
            { baseId, table_id: tableId, records: [{ fields: mappedFields }], ...tc },
          ],
        },
        {
          tool: "create_record",
          args: [
            { base_id: baseId, table_id: tableId, fields: mappedFields, ...tc },
            { baseId, tableId, fields: mappedFields, ...tc },
            { base_id: baseId, tableId, fields: mappedFields, ...tc },
            { baseId, table_id: tableId, fields: mappedFields, ...tc },
          ],
        },
      ];
      const filteredAttempts =
        availableTools.length > 0
          ? attempts.filter((a) => availableTools.includes(a.tool))
          : attempts;
      const finalAttempts = filteredAttempts.length > 0 ? filteredAttempts : attempts;

      let lastError: unknown = null;
      for (const attempt of finalAttempts) {
        try {
          const result = await this.callAirtableWithArgVariants(
            attempt.tool,
            attempt.args,
            runtime.accessToken,
          );
          return parseMcpResultJson(result);
        } catch (err) {
          lastError = err;
        }
      }

      throw lastError ?? new Error("Aucun tool de création d'enregistrement compatible trouvé.");
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Patch("bases/:baseId/tables/:tableId/records/:recordId")
  async updateRecord(
    @Req() req: AuthRequest,
    @Param() params: AirtableRecordWithIdParams,
    @Body() body: unknown,
  ) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    if (!isAirtableMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.airtable }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { baseId, tableId, recordId } = params;
      const runtime = await getAirtableRuntimeAccess(this.getUserContext(req));
      if (!runtime.available) {
        throw new HttpException(
          { error: "Connectez votre compte Airtable pour modifier des enregistrements." },
          HttpStatus.FORBIDDEN,
        );
      }
      const mappedFields = await this.resolveFieldsForWrite(baseId, tableId, body, runtime.accessToken);
      const writeOpts = extractWriteOptions(body);
      const updateExtras = {
        ...(writeOpts.typecast ? { typecast: true as const } : {}),
        ...(writeOpts.performUpsert ? { performUpsert: writeOpts.performUpsert } : {}),
      };

      let availableTools: string[] = [];
      try {
        const list = await listAirtableMcpTools(runtime.accessToken);
        availableTools = Array.isArray((list as { tools?: unknown[] }).tools)
          ? ((list as { tools: Array<{ name?: string }> }).tools
              .map((t) => (typeof t?.name === "string" ? t.name : ""))
              .filter(Boolean) as string[])
          : [];
      } catch {
        // ignore
      }

      const attempts: Array<{ tool: string; args: Record<string, unknown>[] }> = [
        {
          tool: "update_records_for_table",
          args: [{ baseId, tableId, records: [{ id: recordId, fields: mappedFields }], ...updateExtras }],
        },
        {
          tool: "update_records",
          args: [
            {
              base_id: baseId,
              table_id: tableId,
              records: [{ id: recordId, fields: mappedFields }],
              ...updateExtras,
            },
            { baseId, tableId, records: [{ id: recordId, fields: mappedFields }], ...updateExtras },
          ],
        },
      ];
      const filteredAttempts =
        availableTools.length > 0
          ? attempts.filter((a) => availableTools.includes(a.tool))
          : attempts;
      const finalAttempts = filteredAttempts.length > 0 ? filteredAttempts : attempts;

      let lastError: unknown = null;
      for (const attempt of finalAttempts) {
        try {
          const result = await this.callAirtableWithArgVariants(
            attempt.tool,
            attempt.args,
            runtime.accessToken,
          );
          return parseMcpResultJson(result);
        } catch (err) {
          lastError = err;
        }
      }

      throw lastError ?? new Error("Aucun tool de mise à jour compatible trouvé.");
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("status")
  async status(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
    try {
      const status = await getAirtableConnectionStatus(this.getUserContext(req));
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Airtable";
      throw new HttpException({ error: message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

