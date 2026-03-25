function joinTextContent(content: unknown[]): string {
  const parts: string[] = [];
  for (const block of content) {
    if (block && typeof block === "object" && "type" in block && (block as { type?: string }).type === "text") {
      const t = (block as { text?: string }).text;
      if (typeof t === "string") parts.push(t);
    }
  }
  return parts.join("\n");
}

export function mcpResultToText(result: unknown): string {
  if (result && typeof result === "object" && "content" in result) {
    const contentList = Array.isArray((result as { content?: unknown }).content)
      ? (result as { content: unknown[] }).content
      : [];
    if (contentList.length > 0) {
      const joined = joinTextContent(contentList);
      if (joined.length > 0) return joined;
    }
  }
  if (result && typeof result === "object" && "toolResult" in result) {
    const tr = (result as { toolResult: unknown }).toolResult;
    if (tr && typeof tr === "object" && "content" in tr) {
      const list = Array.isArray((tr as { content?: unknown }).content)
        ? (tr as { content: unknown[] }).content
        : [];
      if (list.length > 0) {
        const joined = joinTextContent(list);
        if (joined.length > 0) return joined;
      }
    }
    return JSON.stringify(tr);
  }
  return JSON.stringify(result);
}

const MCP_PARSE_ERROR_MAX = 12_000;

export function parseMcpResultJson<T = unknown>(result: unknown): T {
  const text = mcpResultToText(result);
  try {
    return JSON.parse(text) as T;
  } catch {
    const tail = text.length > MCP_PARSE_ERROR_MAX ? text.slice(0, MCP_PARSE_ERROR_MAX) + "…" : text;
    throw new Error(`Réponse MCP invalide (JSON attendu) : ${tail}`);
  }
}

function activeVersionNodeCount(av: unknown): number {
  if (!av || typeof av !== "object" || Array.isArray(av)) return 0;
  const nodes = (av as Record<string, unknown>).nodes;
  return Array.isArray(nodes) ? nodes.length : 0;
}

function activeVersionConnectionSources(av: unknown): number {
  if (!av || typeof av !== "object" || Array.isArray(av)) return 0;
  const c = (av as Record<string, unknown>).connections;
  if (!c || typeof c !== "object" || Array.isArray(c)) return 0;
  return Object.keys(c as Record<string, unknown>).length;
}

function pickRicherActiveVersion(a: unknown, b: unknown): unknown {
  const na = activeVersionNodeCount(a);
  const nb = activeVersionNodeCount(b);
  if (nb > na) return b;
  if (na > nb) return a;
  const ca = activeVersionConnectionSources(a);
  const cb = activeVersionConnectionSources(b);
  if (cb > ca) return b;
  if (ca > cb) return a;
  return b ?? a;
}

/**
 * Le SDK MCP peut renvoyer le même payload dans `content[].text` et dans `structuredContent`.
 * On fusionne pour récupérer le `workflow.activeVersion` le plus complet (graphe publié n8n).
 */
export function mergeGetWorkflowDetailsMcpPayload(rawResult: unknown, parsed: Record<string, unknown>): Record<string, unknown> {
  if (!rawResult || typeof rawResult !== "object") return parsed;
  const sc = (rawResult as { structuredContent?: unknown }).structuredContent;
  if (!sc || typeof sc !== "object" || sc === null || Array.isArray(sc)) return parsed;

  const fromSc = sc as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...parsed, ...fromSc };

  const pw = parsed.workflow;
  const sw = fromSc.workflow;
  if (pw && typeof pw === "object" && !Array.isArray(pw) && sw && typeof sw === "object" && !Array.isArray(sw)) {
    const pwo = pw as Record<string, unknown>;
    const swo = sw as Record<string, unknown>;
    merged.workflow = {
      ...pwo,
      ...swo,
      activeVersion: pickRicherActiveVersion(pwo.activeVersion, swo.activeVersion),
    };
  }

  return merged;
}

