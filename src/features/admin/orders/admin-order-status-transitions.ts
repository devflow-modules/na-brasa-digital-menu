import type {
  AdminDeliveryType,
  AdminOrderStatus,
} from "@/features/admin/orders/admin-orders.types";

export type OrderStatusAction = {
  nextStatus: AdminOrderStatus;
  label: string;
  variant: "primary" | "danger" | "secondary";
};

const ACTION_LABELS: Partial<
  Record<`${AdminOrderStatus}->${AdminOrderStatus}`, string>
> = {
  "PENDING->CONFIRMED": "Confirmar pedido",
  "PENDING->CANCELLED": "Cancelar pedido",
  "CONFIRMED->PREPARING": "Iniciar preparo",
  "CONFIRMED->CANCELLED": "Cancelar pedido",
  "PREPARING->READY": "Marcar como pronto",
  "PREPARING->CANCELLED": "Cancelar pedido",
  "READY->OUT_FOR_DELIVERY": "Saiu para entrega",
  "READY->COMPLETED": "Concluir pedido",
  "READY->CANCELLED": "Cancelar pedido",
  "OUT_FOR_DELIVERY->COMPLETED": "Concluir entrega",
  "OUT_FOR_DELIVERY->CANCELLED": "Cancelar pedido",
};

function actionLabel(
  current: AdminOrderStatus,
  next: AdminOrderStatus,
): string {
  return ACTION_LABELS[`${current}->${next}`] ?? "Atualizar status";
}

function actionVariant(
  next: AdminOrderStatus,
  isPrimary: boolean,
): OrderStatusAction["variant"] {
  if (next === "CANCELLED") {
    return "danger";
  }

  return isPrimary ? "primary" : "secondary";
}

/**
 * Returns allowed next statuses for the current status and delivery type.
 * Uses Prisma enum `OUT_FOR_DELIVERY` (not DELIVERING).
 */
export function getAllowedNextStatuses(
  current: AdminOrderStatus,
  deliveryType: AdminDeliveryType,
): AdminOrderStatus[] {
  switch (current) {
    case "PENDING":
      return ["CONFIRMED", "CANCELLED"];
    case "CONFIRMED":
      return ["PREPARING", "CANCELLED"];
    case "PREPARING":
      return ["READY", "CANCELLED"];
    case "READY":
      if (deliveryType === "PICKUP") {
        return ["COMPLETED", "CANCELLED"];
      }
      return ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"];
    case "OUT_FOR_DELIVERY":
      return ["COMPLETED", "CANCELLED"];
    case "COMPLETED":
    case "CANCELLED":
      return [];
  }
}

export function isTransitionAllowed(
  current: AdminOrderStatus,
  next: AdminOrderStatus,
  deliveryType: AdminDeliveryType,
): boolean {
  return getAllowedNextStatuses(current, deliveryType).includes(next);
}

export function getOrderStatusActions(
  current: AdminOrderStatus,
  deliveryType: AdminDeliveryType,
): OrderStatusAction[] {
  const nextStatuses = getAllowedNextStatuses(current, deliveryType);
  const primaryNext = nextStatuses.find((status) => status !== "CANCELLED");

  return nextStatuses.map((nextStatus) => ({
    nextStatus,
    label: actionLabel(current, nextStatus),
    variant: actionVariant(nextStatus, nextStatus === primaryNext),
  }));
}
