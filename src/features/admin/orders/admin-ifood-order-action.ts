import type { IfoodOrderCommandType, OrderStatus } from "@prisma/client";
import type { AdminPermission } from "@/features/admin/auth/admin-permissions";
import {
  IfoodOrderActionBlockedError,
  resolveIfoodTerminalCommand,
} from "@/features/ifood/ifood-order-actions";

export const IFOOD_AWAITING_CONFIRMATION_MESSAGE =
  "Solicitação enviada; aguardando confirmação do iFood";

export function ifoodCommandLabel(command: IfoodOrderCommandType): string {
  switch (command) {
    case "CONFIRM":
      return "Confirmar pedido";
    case "START_PREPARATION":
      return "Iniciar preparo";
    case "READY_TO_PICKUP":
      return "Marcar como pronto";
    case "DISPATCH":
      return "Despachar pedido";
  }
}

export function permissionForIfoodCommand(
  command: IfoodOrderCommandType,
): AdminPermission {
  switch (command) {
    case "CONFIRM":
      return "orders.status.confirm";
    case "START_PREPARATION":
      return "orders.status.prepare";
    case "READY_TO_PICKUP":
      return "orders.status.ready";
    case "DISPATCH":
      return "orders.status.dispatch";
  }
}

/**
 * Next lifecycle command for a projected Order (#131).
 * Terminal uses snapshot orderType (source of truth), not client deliveryType.
 */
export function resolveNextIfoodAdminCommand(input: {
  status: OrderStatus;
  snapshot: unknown;
}): IfoodOrderCommandType | null {
  switch (input.status) {
    case "PENDING":
      return "CONFIRM";
    case "CONFIRMED":
      return "START_PREPARATION";
    case "PREPARING":
      try {
        return resolveIfoodTerminalCommand(input.snapshot);
      } catch (error) {
        if (error instanceof IfoodOrderActionBlockedError) {
          return null;
        }
        throw error;
      }
    default:
      return null;
  }
}
