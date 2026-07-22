import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminOrderQueueFilters } from "@/features/admin/orders/admin-order-queue-filters";
import { buildAdminOrderQueueWhere } from "@/features/admin/orders/admin-order-queue-filters";
import type {
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrderStatus,
  AdminOrdersSummary,
} from "@/features/admin/orders/admin-orders.types";
import {
  buildDirectOrdersAfterCursorWhere,
  type AdminNewOrderCursorPoint,
} from "@/features/admin/orders/new-order-cursor";

export const RECENT_ORDERS_LIMIT = 50;

/** Fixed page size for new-order delta polls (not client-configurable). */
export const ADMIN_NEW_ORDERS_TAKE = 20;

export type AdminNewOrderRow = {
  id: string;
  code: string;
  source: "DIRECT";
  status: AdminOrderStatus;
  customerName: string;
  totalCents: number;
  createdAt: Date;
};

/**
 * Start of the current local day on the server machine.
 * Documented as local server timezone (not store timezone).
 */
export function getStartOfLocalDay(now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export type ListRecentAdminOrdersOptions = {
  limit?: number;
  filters?: AdminOrderQueueFilters;
};

/**
 * Recent orders for the store queue. Filters are applied in the DB before take
 * (not in-memory on an unfiltered page).
 */
export async function listRecentAdminOrders(
  storeId: string,
  options: ListRecentAdminOrdersOptions = {},
): Promise<AdminOrderListItem[]> {
  const limit = options.limit ?? RECENT_ORDERS_LIMIT;
  const filters = options.filters ?? {};

  const orders = await prisma.order.findMany({
    where: buildAdminOrderQueueWhere(storeId, filters),
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      status: true,
      source: true,
      customerName: true,
      customerPhone: true,
      deliveryType: true,
      paymentMethod: true,
      totalCents: true,
      createdAt: true,
    },
  });

  return orders;
}

export async function getAdminOrdersSummary(
  storeId: string,
  displayedCount: number,
): Promise<AdminOrdersSummary> {
  const startOfDay = getStartOfLocalDay();

  const [ordersToday, pendingCount, revenueToday] = await Promise.all([
    prisma.order.count({
      where: { storeId, createdAt: { gte: startOfDay } },
    }),
    prisma.order.count({
      where: { storeId, status: "PENDING" },
    }),
    prisma.order.aggregate({
      where: {
        storeId,
        createdAt: { gte: startOfDay },
        status: { not: "CANCELLED" },
      },
      _sum: { totalCents: true },
    }),
  ]);

  return {
    ordersToday,
    pendingCount,
    revenueTodayCents: revenueToday._sum.totalCents ?? 0,
    displayedCount,
  };
}

export async function getAdminOrderById(
  id: string,
  storeId: string,
): Promise<AdminOrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: { id, storeId },
    select: {
      id: true,
      code: true,
      status: true,
      source: true,
      customerName: true,
      customerPhone: true,
      deliveryType: true,
      deliveryAddress: true,
      paymentMethod: true,
      changeForCents: true,
      paidAt: true,
      notes: true,
      subtotalCents: true,
      deliveryFeeCents: true,
      payments: {
        select: {
          id: true,
          method: true,
          amountCents: true,
          tenderedCents: true,
          changeCents: true,
        },
        orderBy: { createdAt: "asc" },
      },
      totalCents: true,
      whatsappMessage: true,
      createdAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productNameSnapshot: true,
          quantity: true,
          unitPriceCents: true,
          totalCents: true,
          notes: true,
          addons: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              addonNameSnapshot: true,
              addonPriceCents: true,
            },
          },
        },
      },
    },
  });

  return order;
}

export type AdminOrderStatusRecord = {
  id: string;
  status: AdminOrderDetail["status"];
  deliveryType: AdminOrderDetail["deliveryType"];
  storeId: string;
  source: AdminOrderDetail["source"];
  paidAt: Date | null;
};

export async function findOrderStatusForUpdate(
  orderId: string,
  storeId: string,
): Promise<AdminOrderStatusRecord | null> {
  return prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: {
      id: true,
      status: true,
      deliveryType: true,
      storeId: true,
      source: true,
      paidAt: true,
    },
  });
}

export type CounterFinalizePaymentRecord = {
  method: PaymentMethod;
  amountCents: number;
  tenderedCents: number | null;
  changeCents: number | null;
};

export type CounterFinalizeOrderRecord = {
  id: string;
  storeId: string;
  source: AdminOrderDetail["source"];
  status: AdminOrderDetail["status"];
  deliveryType: AdminOrderDetail["deliveryType"];
  paymentMethod: AdminOrderDetail["paymentMethod"];
  changeForCents: number | null;
  paidAt: Date | null;
  totalCents: number;
  payments: CounterFinalizePaymentRecord[];
};

export async function findOrderForCounterFinalize(
  orderId: string,
  storeId: string,
): Promise<CounterFinalizeOrderRecord | null> {
  return prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: {
      id: true,
      storeId: true,
      source: true,
      status: true,
      deliveryType: true,
      paymentMethod: true,
      changeForCents: true,
      paidAt: true,
      totalCents: true,
      payments: {
        select: {
          method: true,
          amountCents: true,
          tenderedCents: true,
          changeCents: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export type FinalizeCounterOrderPaymentLine = {
  method: PaymentMethod;
  amountCents: number;
  tenderedCents: number | null;
  changeCents: number | null;
};

/**
 * Concurrency-safe finalize: updates order only when still READY/unpaid,
 * then inserts OrderPayment rows in the same transaction.
 * storeId on payments is always taken from the trusted store scope — never from client.
 */
export async function finalizeCounterOrderPayment(input: {
  orderId: string;
  storeId: string;
  payments: FinalizeCounterOrderPaymentLine[];
  /** Legacy mirror: single method or null when mixed. */
  paymentMethod: PaymentMethod | null;
  /** Legacy mirror: cash tendered amount when single CASH; else null. */
  changeForCents: number | null;
  paidAt: Date;
  createdByUserId: string | null;
}): Promise<{ updated: boolean }> {
  return prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: {
        id: input.orderId,
        storeId: input.storeId,
        source: "COUNTER",
        status: "READY",
        paidAt: null,
      },
      data: {
        paymentMethod: input.paymentMethod,
        changeForCents: input.changeForCents,
        paidAt: input.paidAt,
        status: "COMPLETED",
      },
    });

    if (result.count !== 1) {
      return { updated: false };
    }

    await tx.orderPayment.createMany({
      data: input.payments.map((line) => ({
        storeId: input.storeId,
        orderId: input.orderId,
        method: line.method,
        amountCents: line.amountCents,
        tenderedCents: line.tenderedCents,
        changeCents: line.changeCents,
        createdByUserId: input.createdByUserId,
      })),
    });

    return { updated: true };
  });
}

export async function updateOrderStatus(
  orderId: string,
  storeId: string,
  nextStatus: AdminOrderDetail["status"],
): Promise<AdminOrderStatusRecord> {
  // Guard again at write time so we never update across stores.
  const owned = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: { id: true },
  });

  if (!owned) {
    throw new Error("ORDER_NOT_IN_STORE");
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: nextStatus },
    select: {
      id: true,
      status: true,
      deliveryType: true,
      storeId: true,
      source: true,
      paidAt: true,
    },
  });
}

const newOrderNotificationSelect = {
  id: true,
  code: true,
  source: true,
  status: true,
  customerName: true,
  totalCents: true,
  createdAt: true,
} as const;

/**
 * Latest DIRECT order tip for bootstrap cursor (no alert payload).
 * storeId must come from authenticated admin context.
 */
export async function findLatestDirectOrderCursor(
  storeId: string,
): Promise<AdminNewOrderCursorPoint | null> {
  const order = await prisma.order.findFirst({
    where: { storeId, source: "DIRECT" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, createdAt: true },
  });

  return order;
}

/**
 * DIRECT orders strictly after cursor for the given store.
 * Fetches `take` rows; caller may request take+1 to detect hasMore.
 */
export async function listDirectOrdersAfterCursor(
  storeId: string,
  cursor: AdminNewOrderCursorPoint,
  take: number,
): Promise<AdminNewOrderRow[]> {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      source: "DIRECT",
      ...buildDirectOrdersAfterCursorWhere(cursor),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take,
    select: newOrderNotificationSelect,
  });

  return orders.map((order) => ({
    id: order.id,
    code: order.code,
    source: "DIRECT" as const,
    status: order.status,
    customerName: order.customerName,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
  }));
}

/**
 * Operational pending load for the store (all OrderSource values).
 * Not "unread notifications".
 */
export async function countPendingOrdersForStore(
  storeId: string,
): Promise<number> {
  return prisma.order.count({
    where: { storeId, status: "PENDING" },
  });
}
