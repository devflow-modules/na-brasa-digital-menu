import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFunnelRateLimiter } from "@/features/analytics/funnel-rate-limit";

describe("createFunnelRateLimiter", () => {
  it("allows up to maxRequests in the window then blocks", () => {
    const now = 1_000;
    const limiter = createFunnelRateLimiter({
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

    assert.equal(limiter.check("b").allowed, true);
  });

  it("resets after the window elapses", () => {
    let now = 1_000;
    const limiter = createFunnelRateLimiter({
      windowMs: 1_000,
      maxRequests: 1,
      now: () => now,
    });

    assert.equal(limiter.check("a").allowed, true);
    assert.equal(limiter.check("a").allowed, false);

    now = 2_100;
    assert.equal(limiter.check("a").allowed, true);
  });
});
