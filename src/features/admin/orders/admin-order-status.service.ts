import type { UserRole } from "@prisma/client";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canTransitionOrderStatus,
} from "@/features/admin/auth/admin-permissions";
import { isTransitionAllowed } from "@/features/admin/orders/admin-order-status-transitions";
import { updateOrderStatusSchema } from "@/features/admin/orders/admin-order-status.schema";
import {
  findOrderStatusForUpdate,
  updateOrderStatus,
} from "@/features/admin/orders/admin-orders.repository";
import type { AdminOrderStatus } from "@/features/admin/orders/admin-orders.types";

export type UpdateOrderStatusResult =
  | { ok: true; status: AdminOrderStatus }
  | { ok: false; message: string };

/**
 * Updates order status within a specific store scope.
 * Caller must resolve storeId and role from session (never from client input).
 */
export async function updateAdminOrderStatus(
  rawInput: unknown,
  storeId: string,
  role: UserRole,
): Promise<UpdateOrderStatusResult> {
  const parsed = updateOrderStatusSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { ok: false, message: "Dados inválidos para atualizar o status." };
  }

  const { orderId, nextStatus } = parsed.data;
  const order = await findOrderStatusForUpdate(orderId, storeId);

  if (!order) {
    // Generic — do not reveal whether the order exists in another store.
    return { ok: false, message: "Pedido não encontrado." };
  }

  if (!isTransitionAllowed(order.status, nextStatus, order.deliveryType)) {
    return { ok: false, message: "Transição de status não permitida." };
  }

  if (
    !canTransitionOrderStatus(
      role,
      order.status,
      nextStatus,
      order.deliveryType,
    )
  ) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  try {
    const updated = await updateOrderStatus(orderId, storeId, nextStatus);
    return { ok: true, status: updated.status };
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_IN_STORE") {
      return { ok: false, message: "Pedido não encontrado." };
    }
    console.error("[updateAdminOrderStatus] failed to update order status");
    return {
      ok: false,
      message: "Não foi possível atualizar o status. Tente novamente.",
    };
  }
}
