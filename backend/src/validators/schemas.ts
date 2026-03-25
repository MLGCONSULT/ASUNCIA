import { z } from "zod";

const positiveInt = (defaultValue: number, max: number) =>
  z.coerce.number().int().min(1).max(max).catch(defaultValue);

export const providerQuerySchema = z.object({
  provider: z.enum(["gmail", "airtable", "notion", "n8n"]),
});

export const mcpCallBodySchema = z.object({
  toolName: z.string().trim().min(1, "toolName requis"),
  arguments: z.record(z.string(), z.unknown()).default({}),
});

export const gmailMessagesQuerySchema = z.object({
  maxResults: positiveInt(20, 50),
  q: z.string().trim().optional(),
});

export const gmailSendBodySchema = z.object({
  to: z.string().trim().email("Adresse email invalide"),
  subject: z.string().default(""),
  body: z.string().default(""),
});

export const notionSearchQuerySchema = z.object({
  filterType: z.enum(["database", "page"]).optional(),
  query: z.string().trim().optional(),
});

export const notionDatabaseParamsSchema = z.object({
  databaseId: z.string().trim().min(1, "databaseId requis"),
});

export const notionDatabaseQuerySchema = z.object({
  pageSize: positiveInt(20, 50),
});

export const airtableRecordParamsSchema = z.object({
  baseId: z.string().trim().min(1, "baseId requis"),
  tableId: z.string().trim().min(1, "tableId requis"),
});

export const airtableBaseParamsSchema = z.object({
  baseId: z.string().trim().min(1, "baseId requis"),
});

export const airtableRecordWithIdParamsSchema = airtableRecordParamsSchema.extend({
  recordId: z.string().trim().min(1, "recordId requis"),
});

export const airtableRecordsQuerySchema = z.object({
  maxRecords: positiveInt(20, 100),
});

export const airtableFieldsBodySchema = z.object({
  fields: z.record(z.string(), z.unknown()).default({}),
}).transform((value) => value.fields);

export const chatBodySchema = z.object({
  message: z.string().trim().min(1, "Message vide"),
  history: z.array(z.object({ role: z.string(), content: z.string() })).default([]),
  conversationId: z.string().trim().nullable().optional(),
  createNew: z.boolean().optional(),
  stream: z.boolean().optional(),
});

export const conversationQuerySchema = z.object({
  conversationId: z.string().trim().optional(),
});

export const conversationCreateBodySchema = z.object({
  titre: z.string().trim().min(1).max(120).optional(),
});

export const n8nWorkflowIdParamsSchema = z.object({
  id: z.string().trim().min(1, "ID du workflow requis."),
});

export const n8nWorkflowsQuerySchema = z.object({
  query: z.string().trim().optional(),
  limit: positiveInt(50, 200),
  projectId: z.string().trim().min(1).optional(),
});

export const n8nExecuteBodySchema = z.object({
  inputs: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const n8nCreateWorkflowBodySchema = z.object({
  name: z.string().trim().min(1, "Le nom du workflow est requis."),
  nodes: z.array(z.unknown()).optional(),
  connections: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const n8nUpdateWorkflowBodySchema = z.object({
  name: z.string().trim().optional(),
  nodes: z.array(z.unknown()).optional(),
  connections: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  active: z.boolean().optional(),
});
