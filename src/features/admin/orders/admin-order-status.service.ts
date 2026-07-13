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

export async function updateAdminOrderStatus(
  rawInput: unknown,
): Promise<UpdateOrderStatusResult> {
  const parsed = updateOrderStatusSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { ok: false, message: "Dados inválidos para atualizar o status." };
  }

  const { orderId, nextStatus } = parsed.data;
  const order = await findOrderStatusForUpdate(orderId);

  if (!order) {
    return { ok: false, message: "Pedido não encontrado." };
  }

  if (
    !isTransitionAllowed(order.status, nextStatus, order.deliveryType)
  ) {
    return { ok: false, message: "Transição de status não permitida." };
  }

  try {
    const updated = await updateOrderStatus(orderId, nextStatus);
    return { ok: true, status: updated.status };
  } catch {
    console.error("[updateAdminOrderStatus] failed to update order status");
    return {
      ok: false,
      message: "Não foi possível atualizar o status. Tente novamente.",
    };
  }
}
