import type {
  DeliveryType,
  PaymentMethod,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PreparedOrder } from "@/features/orders/types";

export type OrderStoreRecord = {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
  isOpen: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeCents: number;
  minimumOrderAmountCents: number;
};

export type CatalogProductRecord = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  active: boolean;
  productAddons: Array<{
    addon: {
      id: string;
      name: string;
      priceCents: number;
      active: boolean;
    };
  }>;
};

export async function findStoreForOrderBySlug(
  slug: string,
): Promise<OrderStoreRecord | null> {
  return prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      whatsapp: true,
      isOpen: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryFeeCents: true,
      minimumOrderAmountCents: true,
    },
  });
}

export async function findActiveProductsForOrder(
  storeId: string,
  productIds: string[],
): Promise<CatalogProductRecord[]> {
  return prisma.product.findMany({
    where: {
      storeId,
      id: { in: productIds },
    },
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      active: true,
      productAddons: {
        select: {
          addon: {
            select: {
              id: true,
              name: true,
              priceCents: true,
              active: true,
            },
          },
        },
      },
    },
  });
}

export async function createOrderWithItems(
  prepared: PreparedOrder,
  whatsappMessage: string,
) {
  const data: Prisma.OrderCreateInput = {
    code: prepared.code,
    customerName: prepared.customerName,
    customerPhone: prepared.customerPhone,
    deliveryType: prepared.deliveryType as DeliveryType,
    deliveryAddress: prepared.deliveryAddress,
    paymentMethod: prepared.paymentMethod as PaymentMethod,
    changeForCents: prepared.changeForCents,
    notes: prepared.notes,
    subtotalCents: prepared.subtotalCents,
    deliveryFeeCents: prepared.deliveryFeeCents,
    totalCents: prepared.totalCents,
    status: "PENDING",
    source: "DIRECT",
    whatsappMessage,
    store: {
      connect: { id: prepared.storeId },
    },
    items: {
      create: prepared.items.map((item) => ({
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        productDescriptionSnapshot: item.productDescriptionSnapshot,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalCents: item.totalCents,
        addons: {
          create: item.addons.map((addon) => ({
            addonId: addon.addonId,
            addonNameSnapshot: addon.addonNameSnapshot,
            addonPriceCents: addon.addonPriceCents,
          })),
        },
      })),
    },
  };

  return prisma.$transaction(async (tx) => {
    return tx.order.create({
      data,
      select: {
        id: true,
        code: true,
      },
    });
  });
}
