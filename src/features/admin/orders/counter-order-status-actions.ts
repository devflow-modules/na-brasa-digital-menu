import type { OrderStatusAction } from "@/features/admin/orders/admin-order-status-transitions";
import type {
  AdminOrderSource,
} from "@/features/admin/orders/admin-orders.types";

/**
 * Source-aware generic status actions (#129).
 * - IFOOD: no local status buttons (lifecycle is event-driven).
 * - COUNTER unpaid: hide COMPLETED (use finalizeCounterOrder).
 */
export function filterGenericStatusActionsForOrder(
  actions: OrderStatusAction[],
  order: {
    source: AdminOrderSource;
    paidAt: Date | null;
  },
): OrderStatusAction[] {
  if (order.source === "IFOOD") {
    return [];
  }

  if (order.source === "COUNTER" && order.paidAt == null) {
    return actions.filter((action) => action.nextStatus !== "COMPLETED");
  }

  return actions;
}
