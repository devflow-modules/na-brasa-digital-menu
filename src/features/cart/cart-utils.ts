import type { AddToCartInput, CartAddon, CartItem, CartState } from "./types";

export function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.max(1, Math.min(99, Math.trunc(quantity)));
}

export function createCartItemId(
  productId: string,
  selectedAddons: CartAddon[],
): string {
  const addonKey = selectedAddons
    .map((addon) => addon.id)
    .sort()
    .join("+");

  return addonKey ? `${productId}__${addonKey}` : productId;
}

export function calculateCartItemTotal(
  productPriceCents: number,
  selectedAddons: CartAddon[],
  quantity: number,
): number {
  const addonsTotal = selectedAddons.reduce(
    (sum, addon) => sum + addon.priceCents,
    0,
  );
  const unitTotal = productPriceCents + addonsTotal;

  return unitTotal * normalizeQuantity(quantity);
}

export function calculateCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.totalCents, 0);
}

export function calculateCartQuantity(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function buildCartState(items: CartItem[]): CartState {
  return {
    items,
    subtotalCents: calculateCartSubtotal(items),
    totalQuantity: calculateCartQuantity(items),
  };
}

export function createCartItem(input: AddToCartInput): CartItem {
  const quantity = normalizeQuantity(input.quantity);
  const selectedAddons = [...input.selectedAddons]
    .map((addon) => ({
      id: addon.id,
      name: addon.name,
      priceCents: addon.priceCents,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const unitPriceCents =
    input.productPriceCents +
    selectedAddons.reduce((sum, addon) => sum + addon.priceCents, 0);

  return {
    id: createCartItemId(input.productId, selectedAddons),
    productId: input.productId,
    productName: input.productName,
    productDescription: input.productDescription ?? null,
    unitPriceCents,
    selectedAddons,
    quantity,
    totalCents: unitPriceCents * quantity,
  };
}

export function upsertCartItem(
  items: CartItem[],
  input: AddToCartInput,
): CartItem[] {
  const nextItem = createCartItem(input);
  const existingIndex = items.findIndex((item) => item.id === nextItem.id);

  if (existingIndex === -1) {
    return [...items, nextItem];
  }

  const existing = items[existingIndex];
  const quantity = normalizeQuantity(existing.quantity + nextItem.quantity);
  const updated: CartItem = {
    ...existing,
    quantity,
    totalCents: existing.unitPriceCents * quantity,
  };

  return items.map((item, index) =>
    index === existingIndex ? updated : item,
  );
}

export function updateCartItemQuantity(
  items: CartItem[],
  itemId: string,
  quantity: number,
): CartItem[] {
  const nextQuantity = normalizeQuantity(quantity);

  return items.map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    return {
      ...item,
      quantity: nextQuantity,
      totalCents: item.unitPriceCents * nextQuantity,
    };
  });
}

export function removeCartItem(items: CartItem[], itemId: string): CartItem[] {
  return items.filter((item) => item.id !== itemId);
}
