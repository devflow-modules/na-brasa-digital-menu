import { prisma } from "@/lib/prisma";
import type { DailyClosingOrderInput } from "@/features/admin/reports/daily-closing.types";

/**
 * Load store orders whose createdAt falls in [start, endExclusive).
 * Select only fields needed for aggregation (no customer PII beyond code).
 */
export async function listOrdersForDailyClosing(options: {
  storeId: string;
  start: Date;
  endExclusive: Date;
}): Promise<DailyClosingOrderInput[]> {
  const orders = await prisma.order.findMany({
    where: {
      storeId: options.storeId,
      createdAt: {
        gte: options.start,
        lt: options.endExclusive,
      },
    },
    orderBy: { createdAt: "asc" },
    select: {
      code: true,
      status: true,
      source: true,
      deliveryType: true,
      paymentMethod: true,
      subtotalCents: true,
      deliveryFeeCents: true,
      totalCents: true,
      createdAt: true,
      items: {
        select: {
          productId: true,
          productNameSnapshot: true,
          quantity: true,
          unitPriceCents: true,
          totalCents: true,
          addons: {
            select: {
              addonId: true,
              addonNameSnapshot: true,
              addonPriceCents: true,
            },
          },
        },
      },
    },
  });

  return orders;
}
