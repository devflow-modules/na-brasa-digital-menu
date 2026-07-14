export type AdminMenuProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  active: boolean;
  available: boolean;
  sortOrder: number;
};

export type AdminMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  products: AdminMenuProduct[];
};

export type AdminMenuCatalog = {
  categories: AdminMenuCategory[];
};

export type AdminMenuActionResult =
  | { ok: true }
  | { ok: false; message: string };
