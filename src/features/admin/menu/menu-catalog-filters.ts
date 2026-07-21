import type {
  AdminMenuCategory,
  AdminMenuProduct,
} from "@/features/admin/menu/admin-menu.types";

export type MenuStatusFilter =
  | "all"
  | "active"
  | "inactive"
  | "available"
  | "unavailable";

export type MenuCatalogCounters = {
  totalProducts: number;
  activeProducts: number;
  unavailableProducts: number;
};

export function countMenuCatalog(
  categories: AdminMenuCategory[],
): MenuCatalogCounters {
  let totalProducts = 0;
  let activeProducts = 0;
  let unavailableProducts = 0;

  for (const category of categories) {
    for (const product of category.products) {
      totalProducts += 1;
      if (product.active) {
        activeProducts += 1;
      }
      if (!product.available) {
        unavailableProducts += 1;
      }
    }
  }

  return { totalProducts, activeProducts, unavailableProducts };
}

export function productMatchesMenuFilters(
  product: AdminMenuProduct,
  options: { search: string; status: MenuStatusFilter },
): boolean {
  const query = options.search.trim().toLowerCase();
  if (query.length > 0 && !product.name.toLowerCase().includes(query)) {
    return false;
  }

  switch (options.status) {
    case "active":
      return product.active;
    case "inactive":
      return !product.active;
    case "available":
      return product.available;
    case "unavailable":
      return !product.available;
    default:
      return true;
  }
}

export function filterMenuCatalog(
  categories: AdminMenuCategory[],
  options: {
    search: string;
    status: MenuStatusFilter;
    categoryId: string;
  },
): AdminMenuCategory[] {
  const scoped =
    options.categoryId.length > 0
      ? categories.filter((category) => category.id === options.categoryId)
      : categories;

  return scoped
    .map((category) => ({
      ...category,
      products: category.products.filter((product) =>
        productMatchesMenuFilters(product, options),
      ),
    }))
    .filter((category) => {
      if (options.search.trim().length > 0 || options.status !== "all") {
        return category.products.length > 0;
      }
      if (options.categoryId.length > 0) {
        return true;
      }
      return true;
    });
}
