export type AdminAddonLinkedProduct = {
  id: string;
  name: string;
};

export type AdminAddon = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  active: boolean;
  sortOrder: number;
  linkedProducts: AdminAddonLinkedProduct[];
};

export type AdminAddonLinkProductOption = {
  id: string;
  name: string;
};

export type AdminAddonsCatalog = {
  addons: AdminAddon[];
  products: AdminAddonLinkProductOption[];
};

export type AdminAddonActionResult =
  | { ok: true }
  | { ok: false; message: string };
