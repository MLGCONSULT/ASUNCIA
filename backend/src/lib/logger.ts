/**
 * Logger minimal pour le backend. En prod, remplacer par pino/winston si besoin.
 * En test (NODE_ENV=test), les logs sont silencieux.
 */
const isTest = process.env.NODE_ENV === "test";

function formatMsg(tag: string, msg: string, err?: unknown): string {
  const errStr = err instanceof Error ? err.message : err != null ? String(err) : "";
  return errStr ? `[${tag}] ${msg} ${errStr}` : `[${tag}] ${msg}`;
}

export const logger = {
  info(tag: string, msg: string): void {
    if (!isTest) console.log(formatMsg(tag, msg));
  },
  warn(tag: string, msg: string, err?: unknown): void {
    if (!isTest) console.warn(formatMsg(tag, msg, err));
  },
  error(tag: string, msg: string, err?: unknown): void {
    if (!isTest) console.error(formatMsg(tag, msg, err));
  },
};
