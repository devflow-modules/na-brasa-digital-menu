import { prisma } from "@/lib/prisma";
import type { AdminStoreSettings } from "@/features/admin/settings/admin-store-settings.types";

const storeSettingsSelect = {
  id: true,
  name: true,
  slug: true,
  whatsapp: true,
  address: true,
  openingHours: true,
  isOpen: true,
  pickupEnabled: true,
  deliveryEnabled: true,
  deliveryFeeCents: true,
  minimumOrderAmountCents: true,
} as const;

export async function getAdminStoreSettings(
  storeId: string,
): Promise<AdminStoreSettings | null> {
  return prisma.store.findUnique({
    where: { id: storeId },
    select: storeSettingsSelect,
  });
}

export async function updateAdminStoreSettings(
  storeId: string,
  input: {
    whatsapp: string;
    address: string | null;
    openingHours: string | null;
    deliveryFeeCents: number;
    minimumOrderAmountCents: number;
    pickupEnabled: boolean;
    deliveryEnabled: boolean;
  },
): Promise<boolean> {
  const result = await prisma.store.updateMany({
    where: { id: storeId },
    data: {
      whatsapp: input.whatsapp,
      address: input.address,
      openingHours: input.openingHours,
      deliveryFeeCents: input.deliveryFeeCents,
      minimumOrderAmountCents: input.minimumOrderAmountCents,
      pickupEnabled: input.pickupEnabled,
      deliveryEnabled: input.deliveryEnabled,
    },
  });
  return result.count === 1;
}

export async function setAdminStoreOpen(
  storeId: string,
  isOpen: boolean,
): Promise<boolean> {
  const result = await prisma.store.updateMany({
    where: { id: storeId },
    data: { isOpen },
  });
  return result.count === 1;
}
