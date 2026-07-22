export type FunnelRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type Bucket = {
  count: number;
  windowStartedAtMs: number;
};

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 60;

/**
 * Best-effort in-memory rate limit for the public funnel ingest endpoint.
 * Suitable for pilot traffic; not a distributed limiter.
 */
export function createFunnelRateLimiter(options?: {
  windowMs?: number;
  maxRequests?: number;
  now?: () => number;
}) {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const now = options?.now ?? (() => Date.now());
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string): FunnelRateLimitResult {
      const ts = now();
      const current = buckets.get(key);

      if (!current || ts - current.windowStartedAtMs >= windowMs) {
        buckets.set(key, { count: 1, windowStartedAtMs: ts });
        return { allowed: true };
      }

      if (current.count >= maxRequests) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((windowMs - (ts - current.windowStartedAtMs)) / 1000),
        );
        return { allowed: false, retryAfterSeconds };
      }

      current.count += 1;
      return { allowed: true };
    },
    /** Test helper */
    reset() {
      buckets.clear();
    },
  };
}

export const funnelIngestRateLimiter = createFunnelRateLimiter();
