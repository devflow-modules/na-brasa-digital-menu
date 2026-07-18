export type AdminStoreSettings = {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
  address: string | null;
  openingHours: string | null;
  isOpen: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeCents: number;
  minimumOrderAmountCents: number;
};

export type AdminStoreSettingsActionResult =
  | { ok: true }
  | { ok: false; message: string };
