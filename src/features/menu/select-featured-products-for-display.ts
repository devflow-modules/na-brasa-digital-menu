import type { PublicMenuProduct } from "@/features/menu/menu.types";

/** Pilot-first presentation order for the Destaques strip (UI only). */
export const FEATURED_DISPLAY_PRIORITY_NAMES = [
  "Pão Carne Queijo",
  "Espetinho de Carne",
  "Coca-Cola 350ml",
] as const;

export const FEATURED_DISPLAY_LIMIT = 3;

/**
 * Limits the Destaques strip without changing catalog persistence.
 * Preferred pilot names come first; remaining featured products fill up to the limit.
 */
export function selectFeaturedProductsForDisplay(
  featuredProducts: PublicMenuProduct[],
  limit: number = FEATURED_DISPLAY_LIMIT,
): PublicMenuProduct[] {
  if (featuredProducts.length <= limit) {
    return featuredProducts;
  }

  const priority = new Set<string>(FEATURED_DISPLAY_PRIORITY_NAMES);
  const preferred: PublicMenuProduct[] = [];
  for (const name of FEATURED_DISPLAY_PRIORITY_NAMES) {
    const match = featuredProducts.find((product) => product.name === name);
    if (match) {
      preferred.push(match);
    }
  }

  const remainder = featuredProducts.filter(
    (product) => !priority.has(product.name),
  );

  return [...preferred, ...remainder].slice(0, limit);
}
