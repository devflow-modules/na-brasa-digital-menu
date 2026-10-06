export type InMemoryRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type Bucket = {
  count: number;
  windowStartedAtMs: number;
};

/**
 * Best-effort in-memory sliding-window counter for pilot abuse controls.
 * Not distributed across multiple Vercel instances.
 */
export function createInMemoryRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  now?: () => number;
}) {
  const { windowMs, maxRequests } = options;
  const now = options.now ?? (() => Date.now());
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string): InMemoryRateLimitResult {
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
