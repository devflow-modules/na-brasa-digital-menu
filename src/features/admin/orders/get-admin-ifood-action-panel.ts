import type {
  IfoodOrderCommandStatus,
  IfoodOrderCommandType,
  UserRole,
} from "@prisma/client";
import { hasAdminPermission } from "@/features/admin/auth/admin-permissions";
import {
  ifoodCommandLabel,
  permissionForIfoodCommand,
  resolveNextIfoodAdminCommand,
} from "@/features/admin/orders/admin-ifood-order-action";
import type { AdminOrderStatus } from "@/features/admin/orders/admin-orders.types";
import { prisma } from "@/lib/prisma";

export type AdminIfoodActionPanel = {
  nextCommand: IfoodOrderCommandType | null;
  label: string | null;
  canExecute: boolean;
  awaitingConfirmation: boolean;
  latestCommand: {
    type: IfoodOrderCommandType;
    status: IfoodOrderCommandStatus;
  } | null;
};

/**
 * Server-side panel state for iFood detail actions (#131).
 * Never exposes externalOrderId / merchant / secrets.
 */
export async function getAdminIfoodActionPanel(input: {
  orderId: string;
  storeId: string;
  role: UserRole;
  status: AdminOrderStatus;
  source: string;
}): Promise<AdminIfoodActionPanel | null> {
  if (input.source !== "IFOOD") {
    return null;
  }

  const ifoodOrder = await prisma.ifoodOrder.findFirst({
    where: {
      operationalOrderId: input.orderId,
      storeId: input.storeId,
    },
    select: {
      snapshot: true,
      commands: {
        select: { type: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
      },
    },
  });

  if (!ifoodOrder) {
    return {
      nextCommand: null,
      label: null,
      canExecute: false,
      awaitingConfirmation: false,
      latestCommand: null,
    };
  }

  const nextCommand = resolveNextIfoodAdminCommand({
    status: input.status,
    snapshot: ifoodOrder.snapshot,
  });

  const matching =
    nextCommand != null
      ? (ifoodOrder.commands.find((command) => command.type === nextCommand) ??
        null)
      : null;

  const awaitingConfirmation =
    matching != null &&
    (matching.status === "PENDING" || matching.status === "ACCEPTED");

  const canExecute =
    nextCommand != null &&
    !awaitingConfirmation &&
    hasAdminPermission(input.role, permissionForIfoodCommand(nextCommand));

  return {
    nextCommand,
    label: nextCommand ? ifoodCommandLabel(nextCommand) : null,
    canExecute,
    awaitingConfirmation,
    latestCommand: matching
      ? { type: matching.type, status: matching.status }
      : null,
  };
}
