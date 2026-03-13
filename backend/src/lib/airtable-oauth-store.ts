/**
 * Store temporaire pour les données OAuth Airtable en attente (state -> userId + codeVerifier).
 * En production, utiliser Redis ou une base de données avec expiration.
 */
const pendingStore = new Map<
  string,
  { userId: string; codeVerifier: string; expiresAt: number }
>();

const EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export function setAirtablePending(state: string, userId: string, codeVerifier: string): void {
  pendingStore.set(state, {
    userId,
    codeVerifier,
    expiresAt: Date.now() + EXPIRY_MS,
  });
}

export function getAndDeleteAirtablePending(state: string): { userId: string; codeVerifier: string } | null {
  const pending = pendingStore.get(state);
  if (!pending) return null;
  if (Date.now() > pending.expiresAt) {
    pendingStore.delete(state);
    return null;
  }
  pendingStore.delete(state);
  return { userId: pending.userId, codeVerifier: pending.codeVerifier };
}

// Nettoyage périodique des entrées expirées
setInterval(() => {
  const now = Date.now();
  for (const [state, pending] of pendingStore.entries()) {
    if (now > pending.expiresAt) {
      pendingStore.delete(state);
    }
  }
}, 60 * 1000); // Toutes les minutes
