import { prisma } from "@/lib/prisma";
import type { CounterCatalogCategory } from "@/features/admin/counter-order/counter-order.types";

/**
 * Tenant-scoped catalog for counter UI.
 * Only active categories, available products, and active addons.
 */
export async function getCounterOrderCatalog(
  storeId: string,
): Promise<CounterCatalogCategory[]> {
  const categories = await prisma.category.findMany({
    where: {
      storeId,
      active: true,
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      products: {
        where: {
          active: true,
          available: true,
        },
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          priceCents: true,
          productAddons: {
            where: {
              addon: {
                active: true,
              },
            },
            select: {
              addon: {
                select: {
                  id: true,
                  name: true,
                  priceCents: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return categories
    .filter((category) => category.products.length > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      products: category.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        addons: product.productAddons
          .map((link) => link.addon)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((addon) => ({
            id: addon.id,
            name: addon.name,
            priceCents: addon.priceCents,
          })),
      })),
    }));
}
