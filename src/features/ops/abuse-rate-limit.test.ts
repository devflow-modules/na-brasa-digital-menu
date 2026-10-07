import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkAbuseRateLimit,
  isAbuseRateLimitEnforced,
} from "@/features/ops/abuse-rate-limit";
import { createInMemoryRateLimiter } from "@/features/ops/in-memory-rate-limit";

describe("checkAbuseRateLimit", () => {
  it("skips enforcement when CI=true", () => {
    const previous = process.env.CI;
    process.env.CI = "true";
    try {
      assert.equal(isAbuseRateLimitEnforced(), false);
      const limiter = createInMemoryRateLimiter({
        windowMs: 60_000,
        maxRequests: 1,
      });
      assert.equal(checkAbuseRateLimit(limiter, "k").allowed, true);
      assert.equal(checkAbuseRateLimit(limiter, "k").allowed, true);
    } finally {
      if (previous === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = previous;
      }
    }
  });

  it("enforces when CI is unset", () => {
    const previous = process.env.CI;
    delete process.env.CI;
    try {
      assert.equal(isAbuseRateLimitEnforced(), true);
      const limiter = createInMemoryRateLimiter({
        windowMs: 60_000,
        maxRequests: 1,
      });
      assert.equal(checkAbuseRateLimit(limiter, "k").allowed, true);
      assert.equal(checkAbuseRateLimit(limiter, "k").allowed, false);
    } finally {
      if (previous === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = previous;
      }
    }
  });
});
