import crypto from "node:crypto";
import type { Role, SessionData } from "./types";

export const ALGORITHM = "aes-256-cbc";
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Derive the AES key from SESSION_SECRET on first use, not at import.
 *
 * Reading it at module scope meant createHash().update(undefined) threw
 * ERR_INVALID_ARG_TYPE the instant this module was evaluated, which broke
 * `next build` on any machine without a .env -- a fresh clone, or the portable
 * build's staging copy. The build has no need for the secret; it is only used
 * to sign and verify cookies at request time.
 */
let cachedSecret: Buffer | undefined;

export function getSecret(): Buffer {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.SESSION_SECRET;
  if (!raw) {
    // Fail loudly rather than falling back to a default: a predictable key would
    // let anyone forge a session cookie. The portable build always writes .env
    // (via ensure-env.mjs) before the server starts.
    throw new Error("SESSION_SECRET is not set - see .env.example");
  }
  cachedSecret = crypto.createHash("sha256").update(raw).digest();
  return cachedSecret;
}

export function decryptSession(
  session: string,
  maxAgeMs: number = SESSION_MAX_AGE_MS,
): SessionData | null {
  const [iv, encryptedData] = session.split("|");
  if (!iv || !encryptedData) return null;
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, getSecret(), Buffer.from(iv, "hex"));
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    const [userIdStr, timestamp, role] = decrypted.split("|");
    const userId = Number(userIdStr);
    const createdAt = Number(timestamp);

    if (!Number.isFinite(userId) || !Number.isFinite(createdAt)) return null;
    if (Date.now() - createdAt > maxAgeMs) return null;
    if (role !== "user" && role !== "admin") return null;

    return { userId, role: role as Role, createdAt };
  } catch {
    return null;   // silently invalid on purpose — logging would re-import node:fs
  }
}
