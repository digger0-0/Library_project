import "server-only";
import { headers } from "next/headers";

export async function getClientIp(): Promise<string | undefined> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim(); // first hop = client
    return h.get("x-real-ip") ?? undefined;
  } catch {
    return undefined;
  }
}