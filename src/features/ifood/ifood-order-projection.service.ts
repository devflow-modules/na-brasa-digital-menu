import type { OrderStatus, PrismaClient } from "@prisma/client";
import {
  orderStatusFromIfoodFullCode,
  shouldUpdateOperationalStatus,
} from "@/features/ifood/ifood-order-status-map";
import {
  buildIfoodOperationalOrderCode,
  IfoodSnapshotProjectionError,
  projectIfoodSnapshotToOrderDraft,
} from "@/features/ifood/ifood-snapshot-projection";

export type SyncIfoodOperationalProjectionResult =
  | { ok: true; action: "created" | "status_updated" | "unchanged" | "skipped"; orderId: string | null }
  | { ok: false; reason: string };

/**
 * Idempotent bridge: IfoodOrder snapshot/lifecycle → operational Order (#126).
 * Create once when projectable; advance status from mapped fullCode only.
 * Never invents OrderPayment / whatsappMessage. Failures are returned (caller may retry).
 */
export async function syncIfoodOperationalProjection(options: {
  prisma: PrismaClient;
  connectionId: string;
  externalOrderId: string;
}): Promise<SyncIfoodOperationalProjectionResult> {
  const { prisma, connectionId, externalOrderId } = options;

  const ifoodOrder = await prisma.ifoodOrder.findUnique({
    where: {
      connectionId_externalOrderId: {
        connectionId,
        externalOrderId,
      },
    },
    select: {
      id: true,
      storeId: true,
      externalOrderId: true,
      lastEventFullCode: true,
      snapshot: true,
      operationalOrderId: true,
      operationalOrder: {
        select: { id: true, status: true },
      },
    },
  });

  if (!ifoodOrder) {
    return { ok: false, reason: "ifood_order_missing" };
  }

  const mappedStatus = orderStatusFromIfoodFullCode(ifoodOrder.lastEventFullCode);
  if (mappedStatus == null) {
    return {
      ok: true,
      action: "skipped",
      orderId: ifoodOrder.operationalOrderId,
    };
  }

  if (ifoodOrder.operationalOrderId && ifoodOrder.operationalOrder) {
    return updateLinkedOperationalStatus(
      prisma,
      ifoodOrder.operationalOrder.id,
      ifoodOrder.operationalOrder.status,
      mappedStatus,
    );
  }

  if (ifoodOrder.snapshot == null) {
    return { ok: false, reason: "snapshot_missing" };
  }

  // Create once on first projectable lifecycle (PLACED or later catch-up).
  try {
    const draft = projectIfoodSnapshotToOrderDraft(ifoodOrder.snapshot);
    const code = buildIfoodOperationalOrderCode(ifoodOrder.externalOrderId);

    const created = await prisma.$transaction(async (tx) => {
      // Re-check link inside the transaction to avoid races / orphans.
      const fresh = await tx.ifoodOrder.findUnique({
        where: { id: ifoodOrder.id },
        select: {
          operationalOrderId: true,
          operationalOrder: { select: { id: true, status: true } },
        },
      });

      if (fresh?.operationalOrderId && fresh.operationalOrder) {
        return {
          action: "existing" as const,
          orderId: fresh.operationalOrder.id,
          status: fresh.operationalOrder.status,
        };
      }

      const existingByCode = await tx.order.findUnique({
        where: { code },
        select: { id: true, status: true, source: true },
      });

      if (existingByCode) {
        if (existingByCode.source !== "IFOOD") {
          throw new IfoodSnapshotProjectionError(
            "Operational order code collision with non-IFOOD order",
          );
        }
        await tx.ifoodOrder.update({
          where: { id: ifoodOrder.id },
          data: { operationalOrderId: existingByCode.id },
        });
        return {
          action: "existing" as const,
          orderId: existingByCode.id,
          status: existingByCode.status,
        };
      }

      const order = await tx.order.create({
        data: {
          storeId: ifoodOrder.storeId,
          code,
          customerName: draft.customerName,
          customerPhone: draft.customerPhone,
          deliveryType: draft.deliveryType,
          deliveryAddress: draft.deliveryAddress,
          paymentMethod: null,
          changeForCents: null,
          notes: draft.notes,
          subtotalCents: draft.subtotalCents,
          deliveryFeeCents: draft.deliveryFeeCents,
          totalCents: draft.totalCents,
          status: mappedStatus,
          source: "IFOOD",
          whatsappMessage: null,
          paidAt: null,
          createdByUserId: null,
          items: {
            create: draft.items.map((item) => ({
              productId: null,
              productNameSnapshot: item.productNameSnapshot,
              productDescriptionSnapshot: item.productDescriptionSnapshot,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              totalCents: item.totalCents,
              notes: item.notes,
              addons: {
                create: item.addons.map((addon) => ({
                  addonId: null,
                  addonNameSnapshot: addon.addonNameSnapshot,
                  addonPriceCents: addon.addonPriceCents,
                })),
              },
            })),
          },
        },
        select: { id: true, status: true },
      });

      await tx.ifoodOrder.update({
        where: { id: ifoodOrder.id },
        data: { operationalOrderId: order.id },
      });

      return {
        action: "created" as const,
        orderId: order.id,
        status: order.status,
      };
    });

    if (created.action === "existing") {
      return updateLinkedOperationalStatus(
        prisma,
        created.orderId,
        created.status,
        mappedStatus,
      );
    }

    return { ok: true, action: "created", orderId: created.orderId };
  } catch (error) {
    if (error instanceof IfoodSnapshotProjectionError) {
      return { ok: false, reason: error.message };
    }
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "P2002") {
      // Concurrent create — resolve by re-reading the link.
      const again = await prisma.ifoodOrder.findUnique({
        where: { id: ifoodOrder.id },
        select: {
          operationalOrderId: true,
          operationalOrder: { select: { id: true, status: true } },
        },
      });
      if (again?.operationalOrderId && again.operationalOrder) {
        return updateLinkedOperationalStatus(
          prisma,
          again.operationalOrder.id,
          again.operationalOrder.status,
          mappedStatus,
        );
      }
    }
    throw error;
  }
}

async function updateLinkedOperationalStatus(
  prisma: PrismaClient,
  orderId: string,
  current: OrderStatus,
  next: OrderStatus,
): Promise<SyncIfoodOperationalProjectionResult> {
  if (!shouldUpdateOperationalStatus(current, next)) {
    return { ok: true, action: "unchanged", orderId };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: next },
  });

  return { ok: true, action: "status_updated", orderId };
}
