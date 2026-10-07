import {
  createInMemoryRateLimiter,
  type InMemoryRateLimitResult,
} from "@/features/ops/in-memory-rate-limit";

/** Safe copy — no retry timing or internals leaked to clients. */
export const ABUSE_RATE_LIMIT_MESSAGE =
  "Muitas tentativas. Aguarde um momento e tente novamente.";

/** Admin login: 10 attempts / 15 minutes per IP (pilot). */
export const adminLoginRateLimiter = createInMemoryRateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 10,
});

/** Online createOrder: 20 requests / 1 minute per IP (pilot). */
export const createOrderRateLimiter = createInMemoryRateLimiter({
  windowMs: 60_000,
  maxRequests: 20,
});

type AbuseLimiter = {
  check(key: string): InMemoryRateLimitResult;
};

/**
 * GitHub Actions / Playwright share one runner IP and would exhaust login
 * budgets mid-suite. Production and local `pnpm dev` keep the limits on.
 */
export function isAbuseRateLimitEnforced(): boolean {
  return process.env.CI !== "true";
}

export function checkAbuseRateLimit(
  limiter: AbuseLimiter,
  key: string,
): InMemoryRateLimitResult {
  if (!isAbuseRateLimitEnforced()) {
    return { allowed: true };
  }
  return limiter.check(key);
}