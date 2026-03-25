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
      const list = Array.isArray((tr as { content?: unknown }).content) ? (tr as { content: unknown[] }).content : [];
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
