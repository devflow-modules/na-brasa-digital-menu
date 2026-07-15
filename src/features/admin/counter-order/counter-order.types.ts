export type CounterCatalogAddon = {
  id: string;
  name: string;
  priceCents: number;
};

export type CounterCatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  addons: CounterCatalogAddon[];
};

export type CounterCatalogCategory = {
  id: string;
  name: string;
  products: CounterCatalogProduct[];
};

export type CounterDraftAddon = {
  id: string;
  name: string;
  priceCents: number;
};

export type CounterDraftLine = {
  draftId: string;
  productId: string;
  productName: string;
  quantity: number;
  addonIds: string[];
  addons: CounterDraftAddon[];
  notes: string | null;
  unitPriceCentsForDisplay: number;
  lineTotalCentsForDisplay: number;
};

export type CounterOrderSubmitPayload = {
  customerLabel?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    addonIds: string[];
    notes?: string;
  }>;
};
