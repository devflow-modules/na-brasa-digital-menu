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
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.status, "COMPLETED");
  });
});
