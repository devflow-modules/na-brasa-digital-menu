export type CartAddon = {
  id: string;
  name: string;
  priceCents: number;
};

export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  productDescription?: string | null;
  unitPriceCents: number;
  selectedAddons: CartAddon[];
  quantity: number;
  totalCents: number;
};

export type CartState = {
  items: CartItem[];
  subtotalCents: number;
  totalQuantity: number;
};

export type AddToCartInput = {
  productId: string;
  productName: string;
  productDescription?: string | null;
  productPriceCents: number;
  selectedAddons: CartAddon[];
  quantity: number;
};
