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
  limit = RECENT_ORDERS_LIMIT,
): Promise<AdminOrderListItem[]> {
  const orders = await prisma.order.findMany({
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
  displayedCount: number,
): Promise<AdminOrdersSummary> {
  const startOfDay = getStartOfLocalDay();

  const [ordersToday, pendingCount, revenueToday] = await Promise.all([
    prisma.order.count({
      where: { createdAt: { gte: startOfDay } },
    }),
    prisma.order.count({
      where: { status: "PENDING" },
    }),
    prisma.order.aggregate({
      where: {
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
): Promise<AdminOrderDetail | null> {
  const order = await prisma.order.findUnique({
    where: { id },
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
};

export async function findOrderStatusForUpdate(
  orderId: string,
): Promise<AdminOrderStatusRecord | null> {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      deliveryType: true,
    },
  });
}

export async function updateOrderStatus(
  orderId: string,
  nextStatus: AdminOrderDetail["status"],
): Promise<AdminOrderStatusRecord> {
  return prisma.order.update({
    where: { id: orderId },
    data: { status: nextStatus },
    select: {
      id: true,
      status: true,
      deliveryType: true,
    },
  });
}
