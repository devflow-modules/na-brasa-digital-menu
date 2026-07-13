import { prisma } from "@/lib/prisma";
import type { CheckoutStoreInfo } from "@/features/checkout/types";

export async function getCheckoutStoreBySlug(
  slug: string,
): Promise<CheckoutStoreInfo | null> {
  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      isOpen: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryFeeCents: true,
      minimumOrderAmountCents: true,
    },
  });

  return store;
}
