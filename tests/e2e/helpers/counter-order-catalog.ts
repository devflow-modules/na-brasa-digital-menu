import {
  createE2eAddon,
  createE2eMenuCategory,
  createE2eMenuProduct,
  linkE2eAddonToProduct,
} from "./db";
import { getStoreSlug } from "./test-data";

export type CounterOrderE2eCatalog = {
  storeId: string;
  categoryId: string;
  plainProduct: { id: string; name: string; priceCents: number };
  addonProduct: { id: string; name: string; priceCents: number };
  addon: { id: string; name: string; priceCents: number };
};

/**
 * Predictable catalog for counter-order E2E (active + available + one linked addon).
 */
export async function seedCounterOrderE2eCatalog(options?: {
  storeSlug?: string;
  suffix?: string;
}): Promise<CounterOrderE2eCatalog> {
  const suffix = options?.suffix ?? `${Date.now()}`;
  const category = await createE2eMenuCategory({
    storeSlug: options?.storeSlug ?? getStoreSlug(),
    name: `E2E Menu Counter Cat ${suffix}`,
  });

  const plainProduct = await createE2eMenuProduct({
    categoryId: category.id,
    storeId: category.storeId,
    name: `E2E Menu Counter Plain ${suffix}`,
    priceCents: 2000,
  });

  const addonProduct = await createE2eMenuProduct({
    categoryId: category.id,
    storeId: category.storeId,
    name: `E2E Menu Counter Combo ${suffix}`,
    priceCents: 2800,
  });

  const addon = await createE2eAddon({
    storeId: category.storeId,
    name: `E2E Addon Counter ${suffix}`,
    priceCents: 400,
  });

  await linkE2eAddonToProduct(addonProduct.id, addon.id);

  return {
    storeId: category.storeId,
    categoryId: category.id,
    plainProduct,
    addonProduct,
    addon,
  };
}
