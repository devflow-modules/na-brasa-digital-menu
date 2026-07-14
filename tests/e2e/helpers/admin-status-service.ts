import type { UserRole } from "@prisma/client";
import { updateAdminOrderStatus } from "@/features/admin/orders/admin-order-status.service";
import type { AdminOrderStatus } from "@/features/admin/orders/admin-orders.types";

/**
 * Calls the status service directly (same path as the server action after auth).
 * Used to assert role authorization cannot be bypassed from outside the UI.
 */
export async function attemptOrderStatusUpdate(options: {
  orderId: string;
  nextStatus: AdminOrderStatus;
  storeId: string;
  role: UserRole;
}) {
  return updateAdminOrderStatus(
    {
      orderId: options.orderId,
      nextStatus: options.nextStatus,
    },
    options.storeId,
    options.role,
  );
}
