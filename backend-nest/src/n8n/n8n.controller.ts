import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import OpenAI from "openai";
import { callN8nMcpTool, getN8nEditorBaseUrl, isN8nMcpConfigured } from "../mcp/n8n-client";
import { parseMcpResultJson } from "../mcp/result";
import { MCP_ERROR_MESSAGES } from "../config/mcp";

type AuthRequest = Request & { user?: { id: string } };

type N8nWorkflowsQuery = {
  query?: string;
  limit?: number | string;
};

type N8nWorkflowIdParams = {
  id: string;
};

type N8nExecuteBody = {
  inputs?: unknown;
};

type N8nGenerateWorkflowBody = {
  prompt?: string;
};

type N8nWorkflowNode = {
  id?: string;
  name?: string;
  type?: string;
  typeVersion?: number;
  position?: [number, number];
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
};

type N8nWorkflowJson = {
  name: string;
  nodes: N8nWorkflowNode[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
  [key: string]: unknown;
};

@Controller("n8n")
export class N8nController {
  private isRecentEmailsIntent(prompt: string): boolean {
    const p = prompt.toLowerCase();
    const mentionsMail = p.includes("mail") || p.includes("email") || p.includes("gmail");
    const mentionsRecent =
      p.includes("récent") ||
      p.includes("recent") ||
      p.includes("dernier") ||
      p.includes("latest");
    const mentionsTen = p.includes("10") || p.includes("dix");
    return mentionsMail && (mentionsRecent || mentionsTen);
  }

  private buildRecentEmailsWorkflowTemplate(prompt: string): N8nWorkflowJson {
    return {
      name: "Lister les 10 emails les plus récents",
      nodes: [
        {
          id: "manual_trigger_1",
          name: "Déclenchement manuel",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [260, 280],
          parameters: {},
        },
        {
          id: "gmail_1",
          name: "Récupérer emails Gmail",
          type: "n8n-nodes-base.gmail",
          typeVersion: 2,
          position: [520, 280],
          parameters: {
            resource: "message",
            operation: "getAll",
            returnAll: false,
            limit: 10,
            simple: true,
          },
        },
        {
          id: "set_1",
          name: "Formater la sortie",
          type: "n8n-nodes-base.set",
          typeVersion: 3.4,
          position: [780, 280],
          parameters: {
            keepOnlySet: false,
            values: {
              string: [
                { name: "demande", value: prompt },
                {
                  name: "note",
                  value:
                    "Ce workflow liste 10 emails récents. Configure les credentials Gmail dans n8n avant exécution.",
                },
              ],
            },
          },
        },
      ],
      connections: {
        "Déclenchement manuel": {
          main: [[{ node: "Récupérer emails Gmail", type: "main", index: 0 }]],
        },
        "Récupérer emails Gmail": {
          main: [[{ node: "Formater la sortie", type: "main", index: 0 }]],
        },
      },
      settings: {},
    };
  }

  private sanitizeWorkflowForCompatibility(
    workflow: N8nWorkflowJson,
    knownNodeTypes: string[],
  ): N8nWorkflowJson {
    const known = new Set(knownNodeTypes);
    const safeNodes = workflow.nodes.map((node) => {
      const type = typeof node.type === "string" ? node.type : "";
      const isKnownCustom = type && known.has(type);
      const isCore = type.startsWith("n8n-nodes-base.");
      if (isCore || isKnownCustom) return node;
      return {
        ...node,
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        parameters: {
          method: "GET",
          url: "https://api.example.com",
          options: {},
        },
        name: `${node.name ?? "Action"} (à configurer)`,
      };
    });

    const nodeNames = new Set(
      safeNodes
        .map((n) => (typeof n.name === "string" ? n.name : ""))
        .filter((n) => n.length > 0),
    );

    const safeConnections: Record<string, unknown> = {};
    for (const [sourceName, sourceConn] of Object.entries(workflow.connections ?? {})) {
      if (!nodeNames.has(sourceName)) continue;
      if (!sourceConn || typeof sourceConn !== "object") continue;
      const src = sourceConn as Record<string, unknown>;
      const mains = Array.isArray(src.main) ? src.main : [];
      const filteredMain = mains.map((branch) => {
        if (!Array.isArray(branch)) return [];
        return branch.filter((edge) => {
          if (!edge || typeof edge !== "object") return false;
          const target = (edge as { node?: unknown }).node;
          return typeof target === "string" && nodeNames.has(target);
        });
      });
      safeConnections[sourceName] = { ...src, main: filteredMain };
    }

    return {
      ...workflow,
      nodes: safeNodes,
      connections: safeConnections,
    };
  }

  private extractFirstJsonObject(text: string): string {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1]?.trim() || text.trim();
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return candidate.slice(start, end + 1);
    }
    return candidate;
  }

  private async generateWorkflowJsonInternal(prompt: string) {
    if (this.isRecentEmailsIntent(prompt)) {
      const template = this.buildRecentEmailsWorkflowTemplate(prompt);
      return {
        json: template,
        prettyJson: JSON.stringify(template, null, 2),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      const fallback = this.buildSafeImportableFallbackWorkflow(prompt);
      return {
        json: fallback,
        prettyJson: JSON.stringify(fallback, null, 2),
      };
    }
    const openai = new OpenAI({ apiKey });
    const configuredModel = process.env.OPENAI_CHAT_MODEL?.trim();
    const modelCandidates = [configuredModel, "gpt-4o-mini", "gpt-4.1-mini"].filter(
      (m): m is string => !!m,
    );
    const knownNodeTypes = await this.collectKnownNodeTypes();
    const typeGuidance =
      knownNodeTypes.length > 0
        ? `Types de noeuds autorisés en priorité (issus de l'instance): ${knownNodeTypes.join(", ")}.`
        : "Utilise uniquement des types core n8n commençant par n8n-nodes-base.";
    let lastErrorMessage = "Erreur génération JSON n8n";
    for (const model of modelCandidates) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          max_tokens: 1800,
          messages: [
            {
              role: "system",
              content:
                `Tu génères un workflow n8n importable (n8n 2026). Réponds uniquement avec un objet JSON valide, sans explication.
Le JSON doit contenir: name (string), nodes (array), connections (object), settings (object).
Chaque noeud doit avoir au minimum: name, type, typeVersion, position, parameters.
Si un service externe n'est pas certain, utilise un noeud core n8n compatible (notamment n8n-nodes-base.httpRequest) avec un nom explicite "(à configurer)".
${typeGuidance}`,
            },
            {
              role: "user",
              content: `Demande workflow: ${prompt}`,
            },
          ],
        });

        const content = completion.choices?.[0]?.message?.content?.trim() ?? "";
        if (!content) {
          throw new Error("Réponse vide du modèle.");
        }
        const jsonText = this.extractFirstJsonObject(content);
        const parsed = JSON.parse(jsonText) as Record<string, unknown>;
        const firstPass = this.normalizeAndValidateWorkflow(parsed, knownNodeTypes);
        let finalWorkflow = firstPass.workflow;
        if (firstPass.errors.length > 0) {
          const repair = await openai.chat.completions.create({
            model,
            max_tokens: 1800,
            messages: [
              {
                role: "system",
                content:
                  "Corrige le JSON de workflow n8n pour qu'il soit importable. Réponds uniquement en JSON valide, sans texte.",
              },
              {
                role: "user",
                content: `Corrige ce JSON n8n.\nErreurs à corriger: ${firstPass.errors.join(" | ")}\nJSON:\n${JSON.stringify(firstPass.workflow)}`,
              },
            ],
          });
          const repairedText = repair.choices?.[0]?.message?.content?.trim() ?? "";
          if (!repairedText) {
            throw new Error("Réparation JSON vide.");
          }
          const repairedJson = JSON.parse(this.extractFirstJsonObject(repairedText)) as Record<string, unknown>;
          const secondPass = this.normalizeAndValidateWorkflow(repairedJson, knownNodeTypes);
          if (secondPass.errors.length > 0) {
            throw new Error(`Workflow JSON invalide: ${secondPass.errors.join(" | ")}`);
          }
          finalWorkflow = secondPass.workflow;
        }
        const sanitized = this.sanitizeWorkflowForCompatibility(finalWorkflow, knownNodeTypes);
        return {
          json: sanitized,
          prettyJson: JSON.stringify(sanitized, null, 2),
        };
      } catch (err) {
        lastErrorMessage = err instanceof Error ? err.message : "Erreur génération JSON n8n";
      }
    }
    const fallback = this.buildSafeImportableFallbackWorkflow(prompt, lastErrorMessage);
    return {
      json: fallback,
      prettyJson: JSON.stringify(fallback, null, 2),
    };
  }

  private buildSafeImportableFallbackWorkflow(prompt: string, _reason?: string): N8nWorkflowJson {
    return {
      name: "Workflow généré",
      nodes: [
        {
          id: "manual_trigger_1",
          name: "Déclenchement manuel",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [280, 300],
          parameters: {},
        },
        {
          id: "set_1",
          name: "Contexte demande",
          type: "n8n-nodes-base.set",
          typeVersion: 3.4,
          position: [540, 300],
          parameters: {
            keepOnlySet: false,
            values: {
              string: [
                { name: "demande", value: prompt },
                { name: "status", value: "Ajuste ce workflow selon tes credentials et tes ressources n8n." },
              ],
            },
          },
        },
      ],
      connections: {
        "Déclenchement manuel": {
          main: [[{ node: "Contexte demande", type: "main", index: 0 }]],
        },
      },
      settings: {},
    };
  }

  private normalizeAndValidateWorkflow(
    input: Record<string, unknown>,
    knownNodeTypes: string[],
  ): { workflow: N8nWorkflowJson; errors: string[] } {
    const errors: string[] = [];
    const rawNodes = Array.isArray(input.nodes) ? input.nodes : [];
    const nodeTypesAllowed = new Set(knownNodeTypes);
    const nodes: N8nWorkflowNode[] = rawNodes.map((node, index) => {
      const n = (node && typeof node === "object" ? node : {}) as Record<string, unknown>;
      const type = typeof n.type === "string" ? n.type.trim() : "";
      const name = typeof n.name === "string" && n.name.trim() ? n.name.trim() : `Node ${index + 1}`;
      const id = typeof n.id === "string" && n.id.trim() ? n.id.trim() : `node_${index + 1}`;
      const rawPos = Array.isArray(n.position) ? n.position : null;
      const x = rawPos && typeof rawPos[0] === "number" ? rawPos[0] : 240 + index * 220;
      const y = rawPos && typeof rawPos[1] === "number" ? rawPos[1] : 300;
      const typeVersion = typeof n.typeVersion === "number" && Number.isFinite(n.typeVersion) ? n.typeVersion : 1;
      const parameters =
        n.parameters && typeof n.parameters === "object" && !Array.isArray(n.parameters)
          ? (n.parameters as Record<string, unknown>)
          : {};
      if (!type) {
        errors.push(`Node ${name}: type manquant.`);
      } else if (
        nodeTypesAllowed.size > 0 &&
        !nodeTypesAllowed.has(type) &&
        !type.startsWith("n8n-nodes-base.")
      ) {
        errors.push(`Node ${name}: type non reconnu pour cette instance (${type}).`);
      } else if (!type.startsWith("n8n-nodes-base.") && !type.startsWith("@")) {
        errors.push(`Node ${name}: type potentiellement incompatible (${type}).`);
      }
      return {
        ...n,
        id,
        name,
        type,
        typeVersion,
        position: [x, y],
        parameters,
      };
    });
    if (nodes.length === 0) {
      errors.push("Aucun noeud généré.");
    }

    const connections =
      input.connections && typeof input.connections === "object" && !Array.isArray(input.connections)
        ? (input.connections as Record<string, unknown>)
        : {};
    const nodeNames = new Set(nodes.map((n) => n.name));
    for (const sourceName of Object.keys(connections)) {
      if (!nodeNames.has(sourceName)) {
        errors.push(`Connexion invalide: source ${sourceName} introuvable dans nodes.`);
      }
    }
    const settings =
      input.settings && typeof input.settings === "object" && !Array.isArray(input.settings)
        ? (input.settings as Record<string, unknown>)
        : {};
    const workflow: N8nWorkflowJson = {
      ...input,
      name:
        typeof input.name === "string" && input.name.trim()
          ? input.name.trim()
          : "Workflow généré automatiquement",
      nodes,
      connections,
      settings,
    };
    return { workflow, errors };
  }

  private async collectKnownNodeTypes(): Promise<string[]> {
    if (!isN8nMcpConfigured()) return [];
    try {
      const result = await callN8nMcpTool("search_workflows", { limit: 8 });
      const data = parseMcpResultJson<{ data?: unknown[] } | unknown[]>(result);
      const workflows = Array.isArray(data) ? data : ((data as { data?: unknown[] }).data ?? []);
      const ids = workflows
        .map((w) => (w && typeof w === "object" ? (w as { id?: unknown }).id : null))
        .filter((id): id is string => typeof id === "string")
        .slice(0, 6);
      const types = new Set<string>();
      for (const id of ids) {
        try {
          const detailResult = await callN8nMcpTool("get_workflow_details", { workflowId: id });
          const detail = parseMcpResultJson<Record<string, unknown>>(detailResult);
          const workflowObj =
            detail && typeof detail === "object" && detail.workflow && typeof detail.workflow === "object"
              ? (detail.workflow as Record<string, unknown>)
              : detail;
          const nodes = Array.isArray(workflowObj?.nodes) ? workflowObj.nodes : [];
          for (const node of nodes) {
            if (!node || typeof node !== "object") continue;
            const type = (node as { type?: unknown }).type;
            if (typeof type === "string" && type.trim()) {
              types.add(type.trim());
            }
          }
        } catch {
          // ignore workflow-specific failures
        }
      }
      return Array.from(types);
    } catch {
      return [];
    }
  }

  private ensureAuth(req: AuthRequest): void {
    if (!req.user) {
      throw new HttpException({ error: "Non authentifié" }, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post("generate-workflow-json")
  async generateWorkflowJson(@Req() req: AuthRequest, @Body() body: N8nGenerateWorkflowBody) {
    this.ensureAuth(req);
    const prompt = String(body?.prompt ?? "").trim();
    if (!prompt) {
      throw new HttpException({ error: "Le prompt est requis." }, HttpStatus.BAD_REQUEST);
    }
    return this.generateWorkflowJsonInternal(prompt);
  }

  @Post("generate-mock-json")
  async generateMockJsonCompat(@Req() req: AuthRequest, @Body() body: N8nGenerateWorkflowBody) {
    this.ensureAuth(req);
    const prompt = String(body?.prompt ?? "").trim();
    if (!prompt) {
      throw new HttpException({ error: "Le prompt est requis." }, HttpStatus.BAD_REQUEST);
    }
    return this.generateWorkflowJsonInternal(prompt);
  }

  @Get("workflows")
  async listWorkflows(@Req() req: AuthRequest) {
    this.ensureAuth(req);
    if (!isN8nMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.n8n }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { query, limit } = (req.query || {}) as N8nWorkflowsQuery;
      const normalizedLimit =
        typeof limit === "number"
          ? limit
          : typeof limit === "string" && limit.trim() !== ""
            ? Number(limit)
            : undefined;
      const result = await callN8nMcpTool("search_workflows", {
        query,
        ...(Number.isFinite(normalizedLimit) ? { limit: normalizedLimit } : {}),
      });
      const data = parseMcpResultJson<{ data?: unknown[]; count?: number } | unknown[]>(result);
      const workflows = Array.isArray(data)
        ? data
        : ((data as { data?: unknown[] }).data ?? []);
      const count = Array.isArray(data) ? data.length : (typeof (data as { count?: number }).count === "number" ? (data as { count: number }).count : workflows.length);
      return { workflows, count, editorBaseUrl: getN8nEditorBaseUrl() };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Get("workflows/:id")
  async getWorkflow(@Req() req: AuthRequest, @Param() params: N8nWorkflowIdParams) {
    this.ensureAuth(req);
    if (!isN8nMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.n8n }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { id } = params;
      const result = await callN8nMcpTool("get_workflow_details", { workflowId: id });
      const data = parseMcpResultJson(result);
      const editorBaseUrl = getN8nEditorBaseUrl();
      if (data !== null && typeof data === "object" && !Array.isArray(data)) {
        return { ...(data as Record<string, unknown>), editorBaseUrl };
      }
      return { data, editorBaseUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("workflows/:id/execute")
  async executeWorkflow(
    @Req() req: AuthRequest,
    @Param() params: N8nWorkflowIdParams,
    @Body() body: N8nExecuteBody,
  ) {
    this.ensureAuth(req);
    if (!isN8nMcpConfigured()) {
      throw new HttpException({ error: MCP_ERROR_MESSAGES.n8n }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const { id } = params;
      const inputs = body.inputs ?? (typeof req.body === "object" && req.body !== null ? req.body : undefined);
      const inputsObj = typeof inputs === "object" && inputs !== null ? inputs : undefined;
      const result = await callN8nMcpTool("execute_workflow", {
        workflowId: id,
        ...(inputsObj ? { inputs: inputsObj } : {}),
      });
      const data = parseMcpResultJson(result);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur n8n";
      throw new HttpException({ error: message }, HttpStatus.BAD_GATEWAY);
    }
  }
}

