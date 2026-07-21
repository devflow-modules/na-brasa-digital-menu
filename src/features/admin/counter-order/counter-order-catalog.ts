import { prisma } from "@/lib/prisma";
import { partitionProductAddons } from "@/features/orders/addon-group-selection";
import type { CounterCatalogCategory } from "@/features/admin/counter-order/counter-order.types";

/**
 * Tenant-scoped catalog for counter UI.
 * Only active categories, available products, and active addons/groups.
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
                  active: true,
                },
              },
            },
          },
          addonGroups: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              minSelection: true,
              maxSelection: true,
              active: true,
              sortOrder: true,
              options: {
                orderBy: { sortOrder: "asc" },
                select: {
                  sortOrder: true,
                  addon: {
                    select: {
                      id: true,
                      name: true,
                      priceCents: true,
                      active: true,
                    },
                  },
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
      products: category.products.map((product) => {
        const parts = partitionProductAddons({
          productAddons: product.productAddons.map((link) => ({
            addon: {
              id: link.addon.id,
              name: link.addon.name,
              priceCents: link.addon.priceCents,
              active: link.addon.active,
            },
          })),
          addonGroups: product.addonGroups,
        });

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          addons: parts.independentAddons.map((addon) => ({
            id: addon.id,
            name: addon.name,
            priceCents: addon.priceCents,
          })),
          addonGroups: parts.activeGroups.map((group) => ({
            id: group.id,
            name: group.name,
            minSelection: group.minSelection,
            maxSelection: group.maxSelection,
            sortOrder: group.sortOrder,
            options: group.options.map((option) => ({
              sortOrder: option.sortOrder,
              addon: {
                id: option.addon.id,
                name: option.addon.name,
                priceCents: option.addon.priceCents,
              },
            })),
          })),
        };
      }),
    }));
}
