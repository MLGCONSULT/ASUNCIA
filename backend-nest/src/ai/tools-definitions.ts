import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const CHAT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "mcp_supabase",
      description: "Appel au MCP Supabase : list_tables, execute_sql, list_migrations, etc.",
      parameters: {
        type: "object",
        properties: {
          toolName: { type: "string" },
          arguments: { type: "object", additionalProperties: true },
        },
        required: ["toolName"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mcp_n8n",
      description: "Appel au MCP n8n : lister ou exécuter des workflows.",
      parameters: {
        type: "object",
        properties: {
          toolName: { type: "string" },
          arguments: { type: "object", additionalProperties: true },
        },
        required: ["toolName"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mcp_airtable",
      description: "Appel au MCP Airtable : lister bases, tables, enregistrements.",
      parameters: {
        type: "object",
        properties: {
          toolName: { type: "string" },
          arguments: { type: "object", additionalProperties: true },
        },
        required: ["toolName"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "airtable_list_bases",
      description: "Liste les bases Airtable accessibles.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "airtable_list_records",
      description: "Liste les enregistrements d'une table Airtable.",
      parameters: {
        type: "object",
        properties: {
          baseId: { type: "string" },
          tableId: { type: "string" },
          maxRecords: { type: "number", default: 20 },
        },
        required: ["baseId", "tableId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "n8n_search_workflows",
      description: "Recherche les workflows n8n.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number", default: 20 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "n8n_get_workflow_details",
      description: "Détails d'un workflow n8n.",
      parameters: {
        type: "object",
        properties: {
          workflowId: { type: "string" },
        },
        required: ["workflowId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "n8n_execute_workflow",
      description:
        "Exécute un workflow n8n par son ID. inputs doit suivre le MCP n8n : discriminant type parmi webhook, form, chat (ex. { type: \"webhook\", body: {} } ou { type: \"chat\", chatInput: \"...\" }). Si omis, le serveur envoie un webhook vide.",
      parameters: {
        type: "object",
        properties: {
          workflowId: { type: "string" },
          inputs: { type: "object", additionalProperties: true },
        },
        required: ["workflowId"],
        additionalProperties: false,
      },
    },
  },
];

