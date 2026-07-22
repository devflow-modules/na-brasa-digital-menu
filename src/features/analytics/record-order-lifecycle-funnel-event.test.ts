import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  lifecycleFunnelEventForStatus,
  recordOrderLifecycleFunnelEvent,
} from "@/features/analytics/record-order-lifecycle-funnel-event";

describe("recordOrderLifecycleFunnelEvent", () => {
  it("records with order-derived fields and lifecycle dedupe key", async () => {
    const calls: unknown[] = [];

    const result = await recordOrderLifecycleFunnelEvent(
      {
        storeId: "store_a",
        orderId: "order_1",
        source: "DIRECT",
        name: "order_created",
      },
      {
        recordFunnelEvent: async (input) => {
          calls.push(input);
          return { ok: true, recorded: true };
        },
      },
    );

    assert.deepEqual(result, { ok: true, recorded: true });
    assert.deepEqual(calls, [
      {
        storeId: "store_a",
        orderId: "order_1",
        source: "DIRECT",
        name: "order_created",
        dedupeKey: "order_created:order_1",
      },
    ]);
  });

  it("swallows unexpected recorder failures", async () => {
    const result = await recordOrderLifecycleFunnelEvent(
      {
        storeId: "store_a",
        orderId: "order_1",
        source: "COUNTER",
        name: "order_completed",
      },
      {
        recordFunnelEvent: async () => {
          throw new Error("boom");
        },
      },
    );

    assert.deepEqual(result, { ok: true, recorded: false, reason: "error" });
  });
});

describe("lifecycleFunnelEventForStatus", () => {
  it("maps only confirmed, completed and cancelled", () => {
    assert.equal(lifecycleFunnelEventForStatus("CONFIRMED"), "order_confirmed");
    assert.equal(lifecycleFunnelEventForStatus("COMPLETED"), "order_completed");
    assert.equal(lifecycleFunnelEventForStatus("CANCELLED"), "order_cancelled");
    assert.equal(lifecycleFunnelEventForStatus("PENDING"), null);
    assert.equal(lifecycleFunnelEventForStatus("READY"), null);
  });
});
