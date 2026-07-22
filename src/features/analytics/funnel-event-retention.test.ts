import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFunnelEventPurgePlan } from "@/features/analytics/funnel-event-retention";

describe("buildFunnelEventPurgePlan", () => {
  it("builds a 90-day cutoff and optional store filter", () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    const plan = buildFunnelEventPurgePlan({ now, storeId: "store_a" });

    assert.equal(plan.retentionDays, 90);
    assert.equal(plan.storeId, "store_a");
    assert.equal(
      plan.cutoff.toISOString(),
      new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    );
    assert.deepEqual(plan.where, {
      occurredAt: { lt: plan.cutoff },
      storeId: "store_a",
    });
  });

  it("rejects non-positive retention windows", () => {
    assert.throws(() => buildFunnelEventPurgePlan({ retentionDays: 0 }));
  });
});
