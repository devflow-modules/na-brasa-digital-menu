import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { updateAdminOrderStatus } from "@/features/admin/orders/admin-order-status.service";

describe("updateAdminOrderStatus COUNTER payment guard", () => {
  it("blocks generic COMPLETED for unpaid COUNTER", async () => {
    const result = await updateAdminOrderStatus(
      { orderId: "order_1", nextStatus: "COMPLETED" },
      "store_1",
      "OPERATOR",
      {
        findOrderStatusForUpdate: async () => ({
          id: "order_1",
          storeId: "store_1",
          status: "READY",
          deliveryType: "PICKUP",
          source: "COUNTER",
          paidAt: null,
        }),
        updateOrderStatus: async () => {
          throw new Error("should not update");
        },
      },
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /Receber e finalizar/i);
  });

  it("preserves DIRECT READY → COMPLETED behavior", async () => {
    const result = await updateAdminOrderStatus(
      { orderId: "order_2", nextStatus: "COMPLETED" },
      "store_1",
      "OPERATOR",
      {
        findOrderStatusForUpdate: async () => ({
          id: "order_2",
          storeId: "store_1",
          status: "READY",
          deliveryType: "PICKUP",
          source: "DIRECT",
          paidAt: null,
        }),
        updateOrderStatus: async () => ({
          id: "order_2",
          storeId: "store_1",
          status: "COMPLETED",
          deliveryType: "PICKUP",
          source: "DIRECT",
          paidAt: null,
        }),
        recordOrderLifecycleFunnelEvent: async () => ({
          ok: true,
          recorded: true,
        }),
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.status, "COMPLETED");
  });
});

describe("updateAdminOrderStatus funnel lifecycle", () => {
  it("emits confirmed, completed and cancelled from persisted order identity", async () => {
    const cases = [
      {
        nextStatus: "CONFIRMED" as const,
        from: "PENDING" as const,
        event: "order_confirmed",
      },
      {
        nextStatus: "COMPLETED" as const,
        from: "READY" as const,
        event: "order_completed",
      },
      {
        nextStatus: "CANCELLED" as const,
        from: "PENDING" as const,
        event: "order_cancelled",
      },
    ];

    for (const testCase of cases) {
      const funnelCalls: Array<Record<string, unknown>> = [];
      const result = await updateAdminOrderStatus(
        { orderId: "order_9", nextStatus: testCase.nextStatus },
        "store_1",
        "MANAGER",
        {
          findOrderStatusForUpdate: async () => ({
            id: "order_9",
            storeId: "store_1",
            status: testCase.from,
            deliveryType: "PICKUP",
            source: "DIRECT",
            paidAt: null,
          }),
          updateOrderStatus: async () => ({
            id: "order_9",
            storeId: "store_1",
            status: testCase.nextStatus,
            deliveryType: "PICKUP",
            source: "DIRECT",
            paidAt: null,
          }),
          recordOrderLifecycleFunnelEvent: async (input) => {
            funnelCalls.push(input);
            return { ok: true, recorded: true };
          },
        },
      );

      assert.equal(
        result.ok,
        true,
        !result.ok ? result.message : testCase.nextStatus,
      );
      assert.deepEqual(funnelCalls, [
        {
          storeId: "store_1",
          orderId: "order_9",
          source: "DIRECT",
          name: testCase.event,
        },
      ]);
    }
  });

  it("does not emit funnel events for intermediate statuses", async () => {
    const funnelCalls: unknown[] = [];
    const result = await updateAdminOrderStatus(
      { orderId: "order_3", nextStatus: "PREPARING" },
      "store_1",
      "OPERATOR",
      {
        findOrderStatusForUpdate: async () => ({
          id: "order_3",
          storeId: "store_1",
          status: "CONFIRMED",
          deliveryType: "PICKUP",
          source: "DIRECT",
          paidAt: null,
        }),
        updateOrderStatus: async () => ({
          id: "order_3",
          storeId: "store_1",
          status: "PREPARING",
          deliveryType: "PICKUP",
          source: "DIRECT",
          paidAt: null,
        }),
        recordOrderLifecycleFunnelEvent: async (input) => {
          funnelCalls.push(input);
          return { ok: true, recorded: true };
        },
      },
    );

    assert.equal(result.ok, true);
    assert.equal(funnelCalls.length, 0);
  });

  it("keeps successful transition when funnel recording throws", async () => {
    const result = await updateAdminOrderStatus(
      { orderId: "order_4", nextStatus: "CONFIRMED" },
      "store_1",
      "OPERATOR",
      {
        findOrderStatusForUpdate: async () => ({
          id: "order_4",
          storeId: "store_1",
          status: "PENDING",
          deliveryType: "PICKUP",
          source: "COUNTER",
          paidAt: null,
        }),
        updateOrderStatus: async () => ({
          id: "order_4",
          storeId: "store_1",
          status: "CONFIRMED",
          deliveryType: "PICKUP",
          source: "COUNTER",
          paidAt: null,
        }),
        recordOrderLifecycleFunnelEvent: async () => {
          throw new Error("funnel down");
        },
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.status, "CONFIRMED");
  });
});
