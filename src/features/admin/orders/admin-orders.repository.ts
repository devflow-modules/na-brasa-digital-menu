import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrdersSummary,
} from "@/features/admin/orders/admin-orders.types";

const RECENT_ORDERS_LIMIT = 50;

/**
 * Start of the current local day on the server machine.
 * Documented as local server timezone (not store timezone).
 */
export function getStartOfLocalDay(now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function listRecentAdminOrders(
  storeId: string,
  limit = RECENT_ORDERS_LIMIT,
): Promise<AdminOrderListItem[]> {
  const orders = await prisma.order.findMany({
    where: { storeId },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      status: true,
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
    },
  });
}

export async function finalizeCounterOrderPayment(input: {
  orderId: string;
  storeId: string;
  paymentMethod: PaymentMethod;
  changeForCents: number | null;
  paidAt: Date;
}): Promise<{ updated: boolean }> {
  const result = await prisma.order.updateMany({
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

  return { updated: result.count === 1 };
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
