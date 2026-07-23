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
import {
  lifecycleFunnelEventForStatus,
  recordOrderLifecycleFunnelEvent,
} from "@/features/analytics/record-order-lifecycle-funnel-event";
import { logOpsInfo } from "@/features/ops/ops-log";
import { logOpsCriticalError } from "@/features/ops/monitoring-webhook";

export type UpdateOrderStatusResult =
  | { ok: true; status: AdminOrderStatus }
  | { ok: false; message: string };

export type UpdateAdminOrderStatusDeps = {
  findOrderStatusForUpdate: typeof findOrderStatusForUpdate;
  updateOrderStatus: typeof updateOrderStatus;
  recordOrderLifecycleFunnelEvent?: typeof recordOrderLifecycleFunnelEvent;
};

const defaultDeps: UpdateAdminOrderStatusDeps = {
  findOrderStatusForUpdate,
  updateOrderStatus,
  recordOrderLifecycleFunnelEvent,
};

/**
 * Updates order status within a specific store scope.
 * Caller must resolve storeId and role from session (never from client input).
 */
export async function updateAdminOrderStatus(
  rawInput: unknown,
  storeId: string,
  role: UserRole,
  deps: UpdateAdminOrderStatusDeps = defaultDeps,
): Promise<UpdateOrderStatusResult> {
  const parsed = updateOrderStatusSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { ok: false, message: "Dados inválidos para atualizar o status." };
  }

  const { orderId, nextStatus } = parsed.data;
  const order = await deps.findOrderStatusForUpdate(orderId, storeId);

  if (!order) {
    // Generic — do not reveal whether the order exists in another store.
    return { ok: false, message: "Pedido não encontrado." };
  }

  if (order.source === "IFOOD") {
    return {
      ok: false,
      message:
        "Pedidos iFood só podem ter o status atualizado pelos eventos da plataforma.",
    };
  }

  if (
    nextStatus === "COMPLETED" &&
    order.source === "COUNTER" &&
    order.paidAt == null
  ) {
    return {
      ok: false,
      message:
        "Pedidos de balcão devem ser recebidos por Receber e finalizar.",
    };
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
    const updated = await deps.updateOrderStatus(orderId, storeId, nextStatus);

    const lifecycleName = lifecycleFunnelEventForStatus(updated.status);
    if (lifecycleName) {
      try {
        const recordLifecycle =
          deps.recordOrderLifecycleFunnelEvent ??
          recordOrderLifecycleFunnelEvent;
        await recordLifecycle({
          storeId: order.storeId,
          orderId: order.id,
          source: order.source,
          name: lifecycleName,
        });
      } catch {
        // Telemetry must never fail status transitions.
      }
    }

    logOpsInfo({
      scope: "admin.order-status",
      message: "Order status updated",
      orderId: order.id,
      storeId: order.storeId,
      code: updated.status,
    });

    return { ok: true, status: updated.status };
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_IN_STORE") {
      return { ok: false, message: "Pedido não encontrado." };
    }
    await logOpsCriticalError({
      scope: "admin.order-status",
      message: "Failed to update order status",
      orderId,
      storeId,
      code: "update_failed",
    });
    return {
      ok: false,
      message: "Não foi possível atualizar o status. Tente novamente.",
    };
  }
}
