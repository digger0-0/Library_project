import crypto from "node:crypto";
import type { Role, SessionData } from "./types";

export const ALGORITHM = "aes-256-cbc";
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const SECRET = crypto
  .createHash("sha256")
  .update(process.env.SESSION_SECRET as string)
  .digest();
  
export function decryptSession(
  session: string,
  maxAgeMs: number = SESSION_MAX_AGE_MS,
): SessionData | null {
  const [iv, encryptedData] = session.split("|");
  if (!iv || !encryptedData) return null;
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET, Buffer.from(iv, "hex"));
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
