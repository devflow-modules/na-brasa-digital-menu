import type { UserRole } from "@prisma/client";
import {
  toggleAdminStoreOpenForTests,
  updateAdminStoreSettingsForTests,
} from "@/features/admin/settings/admin-store-settings.service";
import { getPrisma } from "./db";

export type E2eStoreSettingsSnapshot = {
  whatsapp: string;
  address: string | null;
  openingHours: string | null;
  deliveryFeeCents: number;
  minimumOrderAmountCents: number;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  isOpen: boolean;
};

export async function captureE2eStoreSettings(
  storeSlug: string,
): Promise<E2eStoreSettingsSnapshot & { storeId: string }> {
  const prisma = getPrisma();
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
    select: {
      id: true,
      whatsapp: true,
      address: true,
      openingHours: true,
      deliveryFeeCents: true,
      minimumOrderAmountCents: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      isOpen: true,
    },
  });
  if (!store) {
    throw new Error(`Store "${storeSlug}" not found for E2E settings snapshot.`);
  }
  return {
    storeId: store.id,
    whatsapp: store.whatsapp,
    address: store.address,
    openingHours: store.openingHours,
    deliveryFeeCents: store.deliveryFeeCents,
    minimumOrderAmountCents: store.minimumOrderAmountCents,
    pickupEnabled: store.pickupEnabled,
    deliveryEnabled: store.deliveryEnabled,
    isOpen: store.isOpen,
  };
}

export async function restoreE2eStoreSettings(
  storeId: string,
  snapshot: E2eStoreSettingsSnapshot,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.store.update({
    where: { id: storeId },
    data: {
      whatsapp: snapshot.whatsapp,
      address: snapshot.address,
      openingHours: snapshot.openingHours,
      deliveryFeeCents: snapshot.deliveryFeeCents,
      minimumOrderAmountCents: snapshot.minimumOrderAmountCents,
      pickupEnabled: snapshot.pickupEnabled,
      deliveryEnabled: snapshot.deliveryEnabled,
      isOpen: snapshot.isOpen,
    },
  });
}

export async function attemptUpdateStoreSettings(options: {
  input: unknown;
  storeId: string;
  role: UserRole;
}) {
  return updateAdminStoreSettingsForTests(
    options.input,
    options.storeId,
    options.role,
  );
}

export async function attemptToggleStoreOpen(options: {
  isOpen: boolean;
  storeId: string;
  role: UserRole;
}) {
  return toggleAdminStoreOpenForTests(
    { isOpen: options.isOpen },
    options.storeId,
    options.role,
  );
}
