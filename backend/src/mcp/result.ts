export function mcpResultToText(result: unknown): string {
  if (result && typeof result === "object" && "content" in result) {
    const contentList = Array.isArray((result as { content?: unknown }).content)
      ? (result as { content: unknown[] }).content
      : [];
    const first = contentList[0] as { type?: string; text?: string } | undefined;
    const text = first?.type === "text" ? first.text : undefined;
    if (text != null) return text;
  }
  if (result && typeof result === "object" && "toolResult" in result) {
    const tr = (result as { toolResult: unknown }).toolResult;
    if (tr && typeof tr === "object" && "content" in tr) {
      const list = Array.isArray((tr as { content?: unknown }).content) ? (tr as { content: unknown[] }).content : [];
      const first = list[0] as { type?: string; text?: string } | undefined;
      const text = first?.type === "text" ? first.text : undefined;
      if (text != null) return text;
    }
    return JSON.stringify(tr);
  }
  return JSON.stringify(result);
}

export function parseMcpResultJson<T = unknown>(result: unknown): T {
  const text = mcpResultToText(result);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Réponse MCP invalide (JSON attendu) : ${text.slice(0, 200)}`);
  }
}
