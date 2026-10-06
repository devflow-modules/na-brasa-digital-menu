import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInMemoryRateLimiter } from "@/features/ops/in-memory-rate-limit";

describe("createInMemoryRateLimiter", () => {
  it("allows requests under the max within a window", () => {
    const now = 1_000;
    const limiter = createInMemoryRateLimiter({
      windowMs: 60_000,
      maxRequests: 3,
      now: () => now,
    });

    assert.equal(limiter.check("a").allowed, true);
    assert.equal(limiter.check("a").allowed, true);
    assert.equal(limiter.check("a").allowed, true);
    const blocked = limiter.check("a");
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) {
      assert.ok(blocked.retryAfterSeconds >= 1);
    }
  });

  it("isolates keys and resets after the window", () => {
    let now = 1_000;
    const limiter = createInMemoryRateLimiter({
      windowMs: 1_000,
      maxRequests: 1,
      now: () => now,
    });

    assert.equal(limiter.check("a").allowed, true);
    assert.equal(limiter.check("a").allowed, false);
    assert.equal(limiter.check("b").allowed, true);

    now = 2_100;
    assert.equal(limiter.check("a").allowed, true);
  });
});
