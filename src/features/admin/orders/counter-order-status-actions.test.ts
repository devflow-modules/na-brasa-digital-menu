import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterGenericStatusActionsForOrder } from "@/features/admin/orders/counter-order-status-actions";
import type { OrderStatusAction } from "@/features/admin/orders/admin-order-status-transitions";

const actions: OrderStatusAction[] = [
  {
    nextStatus: "COMPLETED",
    label: "Concluir pedido",
    variant: "primary",
  },
  {
    nextStatus: "CANCELLED",
    label: "Cancelar pedido",
    variant: "danger",
  },
];

describe("filterGenericStatusActionsForOrder", () => {
  it("hides COMPLETED for unpaid COUNTER", () => {
    const filtered = filterGenericStatusActionsForOrder(actions, {
      source: "COUNTER",
      paidAt: null,
    });
    assert.deepEqual(
      filtered.map((action) => action.nextStatus),
      ["CANCELLED"],
    );
  });

  it("keeps COMPLETED for DIRECT and paid COUNTER", () => {
    assert.equal(
      filterGenericStatusActionsForOrder(actions, {
        source: "DIRECT",
        paidAt: null,
      }).length,
      2,
    );
    assert.equal(
      filterGenericStatusActionsForOrder(actions, {
        source: "COUNTER",
        paidAt: new Date(),
      }).length,
      2,
    );
  });

  it("hides all generic actions for IFOOD", () => {
    assert.deepEqual(
      filterGenericStatusActionsForOrder(actions, {
        source: "IFOOD",
        paidAt: null,
      }),
      [],
    );
  });
});
