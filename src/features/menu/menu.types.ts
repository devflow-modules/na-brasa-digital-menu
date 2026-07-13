export type PublicMenuAddon = {
  id: string;
  name: string;
  priceCents: number;
  sortOrder: number;
};

export type PublicMenuProduct = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  featured: boolean;
  sortOrder: number;
  addons: PublicMenuAddon[];
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  products: PublicMenuProduct[];
};

export type PublicMenuStore = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isOpen: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeCents: number;
  minimumOrderAmountCents: number;
  openingHours: string | null;
  address: string | null;
};

export type PublicMenu = {
  store: PublicMenuStore;
  categories: PublicMenuCategory[];
  featuredProducts: PublicMenuProduct[];
};
