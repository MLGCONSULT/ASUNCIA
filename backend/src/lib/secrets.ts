import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const SECRET_PREFIX = "enc:v1:";

function resolveKey(): Buffer {
  const raw = process.env.MCP_CONFIG_ENCRYPTION_KEY?.trim() || "";
  if (!raw) {
    throw new Error("MCP_CONFIG_ENCRYPTION_KEY manquant (32 bytes requis).");
  }
  if (/^[a-f0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {
    // ignore
  }
  const utf8 = Buffer.from(raw, "utf8");
  if (utf8.length === 32) return utf8;
  throw new Error("MCP_CONFIG_ENCRYPTION_KEY invalide (utilisez 32 bytes en hex/base64/utf8).");
}

export function encryptSecret(plainText: string | null | undefined): string | null {
  if (!plainText) return null;
  const key = resolveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${SECRET_PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64")}`;
}

export function decryptSecret(cipherText: string | null | undefined): string | null {
  if (!cipherText) return null;
  if (!cipherText.startsWith(SECRET_PREFIX)) {
    // Compatibilité historique (anciennes valeurs non chiffrées).
    return cipherText;
  }
  const key = resolveKey();
  const payload = Buffer.from(cipherText.slice(SECRET_PREFIX.length), "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
