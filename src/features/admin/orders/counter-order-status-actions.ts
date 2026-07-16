import type { OrderStatusAction } from "@/features/admin/orders/admin-order-status-transitions";
import type {
  AdminOrderSource,
} from "@/features/admin/orders/admin-orders.types";

/**
 * COUNTER unpaid orders cannot use the generic COMPLETED transition.
 * Payment confirmation must go through finalizeCounterOrder.
 */
export function filterGenericStatusActionsForOrder(
  actions: OrderStatusAction[],
  order: {
    source: AdminOrderSource;
    paidAt: Date | null;
  },
): OrderStatusAction[] {
  if (order.source === "COUNTER" && order.paidAt == null) {
    return actions.filter((action) => action.nextStatus !== "COMPLETED");
  }

  return actions;
}
