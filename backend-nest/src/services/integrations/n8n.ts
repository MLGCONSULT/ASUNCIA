export async function callFirstAvailableTool<T>(
  toolNames: string[],
  invoke: (toolName: string) => Promise<T>,
): Promise<T> {
  let lastError: Error | null = null;

  for (const toolName of toolNames) {
    try {
      return await invoke(toolName);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Aucun outil compatible disponible.");
}

