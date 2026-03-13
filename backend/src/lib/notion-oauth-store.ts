/**
 * Stockage temporaire state -> { userId, codeVerifier } pour le flux OAuth Notion.
 * En production, préférer Redis ou une table (oauth_pending) pour multi-instance.
 */
const pending = new Map<
  string,
  { userId: string; codeVerifier: string; createdAt: number }
>();
const TTL_MS = 10 * 60 * 1000; // 10 min

function prune(): void {
  const now = Date.now();
  for (const [state, v] of pending.entries()) {
    if (now - v.createdAt > TTL_MS) pending.delete(state);
  }
}

export function setNotionPending(
  state: string,
  userId: string,
  codeVerifier: string
): void {
  prune();
  pending.set(state, { userId, codeVerifier, createdAt: Date.now() });
}

export function getAndDeleteNotionPending(state: string): {
  userId: string;
  codeVerifier: string;
} | null {
  const v = pending.get(state);
  pending.delete(state);
  if (!v) return null;
  if (Date.now() - v.createdAt > TTL_MS) return null;
  return { userId: v.userId, codeVerifier: v.codeVerifier };
}
