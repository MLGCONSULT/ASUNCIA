import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const CHAT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_leads",
      description: "Liste les leads du CRM (nom, email, statut, date).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Crée un nouveau lead.",
      parameters: {
        type: "object",
        properties: {
          nom: { type: "string", description: "Nom du lead" },
          email: { type: "string", description: "Email du lead" },
          statut: {
            type: "string",
            description: "Statut : nouveau, contacte, qualifie, gagne, perdu",
            enum: ["nouveau", "contacte", "qualifie", "gagne", "perdu"],
          },
        },
        required: ["nom", "email"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead",
      description: "Modifie un lead existant (id requis).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID du lead" },
          nom: { type: "string" },
          email: { type: "string" },
          statut: {
            type: "string",
            enum: ["nouveau", "contacte", "qualifie", "gagne", "perdu"],
          },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
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
      name: "mcp_gmail",
      description: "Appel au MCP Gmail : lire, envoyer, rechercher des emails.",
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
      name: "mcp_notion",
      description: "Appel au MCP Notion : rechercher, lire ou écrire des pages et bases.",
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
      name: "gmail_list_messages",
      description: "Liste les derniers emails Gmail.",
      parameters: {
        type: "object",
        properties: {
          maxResults: { type: "number", default: 15 },
        },
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
      name: "notion_search",
      description: "Recherche dans Notion (bases et pages).",
      parameters: {
        type: "object",
        properties: {
          filterType: { type: "string", enum: ["database", "page"] },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "notion_query_database",
      description: "Contenu d'une base de données Notion.",
      parameters: {
        type: "object",
        properties: {
          databaseId: { type: "string" },
          pageSize: { type: "number", default: 20 },
        },
        required: ["databaseId"],
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
      description: "Exécute un workflow n8n par son ID.",
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

