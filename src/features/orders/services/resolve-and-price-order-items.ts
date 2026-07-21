import { validateAddonSelectionForProduct } from "@/features/orders/addon-group-selection";
import {
  findActiveProductsForOrder,
  type CatalogProductRecord,
} from "@/features/orders/repositories/orders.repository";
import type { PreparedOrderItem } from "@/features/orders/types";

export type OrderItemPricingRequest = {
  productId: string;
  quantity: number;
  addonIds: string[];
  notes?: string | null;
};

export type ResolveAndPriceOrderItemsSuccess = {
  ok: true;
  items: PreparedOrderItem[];
  subtotalCents: number;
};

export type ResolveAndPriceOrderItemsFailure = {
  ok: false;
  message: string;
};

export type ResolveAndPriceOrderItemsResult =
  | ResolveAndPriceOrderItemsSuccess
  | ResolveAndPriceOrderItemsFailure;

/**
 * Shared catalog resolution + pricing for order entrypoints.
 * Does not apply minimum order, delivery fee, store-open, WhatsApp, or payment rules.
 */
export function priceOrderItemsFromCatalog(
  products: CatalogProductRecord[],
  items: OrderItemPricingRequest[],
): ResolveAndPriceOrderItemsResult {
  if (items.length === 0) {
    return { ok: false, message: "Carrinho vazio" };
  }

  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  const preparedItems: PreparedOrderItem[] = [];

  for (const item of items) {
    const product = productsById.get(item.productId);

    if (!product) {
      return {
        ok: false,
        message: "Um ou mais produtos não foram encontrados.",
      };
    }

    if (!product.active) {
      return {
        ok: false,
        message: `O produto "${product.name}" não está disponível.`,
      };
    }

    if (!product.available) {
      return {
        ok: false,
        message: "Produto indisponível no momento.",
      };
    }

    const selection = validateAddonSelectionForProduct(product, item.addonIds);
    if (!selection.ok) {
      return selection;
    }

    const preparedAddons = selection.selectedAddons.map((addon) => ({
      addonId: addon.id,
      addonNameSnapshot: addon.name,
      addonPriceCents: addon.priceCents,
    }));

    const addonsTotalCents = preparedAddons.reduce(
      (sum, addon) => sum + addon.addonPriceCents,
      0,
    );
    const unitPriceCents = product.priceCents + addonsTotalCents;
    const totalCents = unitPriceCents * item.quantity;
    const notes = item.notes?.trim() ? item.notes.trim() : null;

    preparedItems.push({
      productId: product.id,
      productNameSnapshot: product.name,
      productDescriptionSnapshot: product.description,
      quantity: item.quantity,
      unitPriceCents,
      totalCents,
      notes,
      addons: preparedAddons,
    });
  }

  const subtotalCents = preparedItems.reduce(
    (sum, item) => sum + item.totalCents,
    0,
  );

  return {
    ok: true,
    items: preparedItems,
    subtotalCents,
  };
}

export async function resolveAndPriceOrderItems(
  storeId: string,
  items: OrderItemPricingRequest[],
): Promise<ResolveAndPriceOrderItemsResult> {
  if (items.length === 0) {
    return { ok: false, message: "Carrinho vazio" };
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await findActiveProductsForOrder(storeId, productIds);
  return priceOrderItemsFromCatalog(products, items);
}
