import { headers } from "next/headers";

/**
 * Best-effort client key for abuse rate limits (IP from proxy headers).
 * Does not log or return the raw IP to callers beyond the opaque key string.
 */
export async function resolveRequestRateLimitKey(
  scope: string,
): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    "unknown";

  return `${scope}:${ip}`;
}
