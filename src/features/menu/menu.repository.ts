import { prisma } from "@/lib/prisma";
import { partitionProductAddons } from "@/features/orders/addon-group-selection";
import type {
  PublicMenu,
  PublicMenuAddon,
  PublicMenuAddonGroup,
  PublicMenuCategory,
  PublicMenuProduct,
  PublicMenuStore,
} from "@/features/menu/menu.types";

export type {
  PublicMenu,
  PublicMenuAddon,
  PublicMenuAddonGroup,
  PublicMenuCategory,
  PublicMenuProduct,
  PublicMenuStore,
} from "@/features/menu/menu.types";

function mapPublicProduct(product: {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  featured: boolean;
  sortOrder: number;
  available: boolean;
  productAddons: Array<{
    addon: {
      id: string;
      name: string;
      priceCents: number;
      sortOrder: number;
      active: boolean;
    };
  }>;
  addonGroups: Array<{
    id: string;
    name: string;
    description: string | null;
    minSelection: number;
    maxSelection: number;
    active: boolean;
    sortOrder: number;
    options: Array<{
      sortOrder: number;
      addon: {
        id: string;
        name: string;
        priceCents: number;
        sortOrder: number;
        active: boolean;
      };
    }>;
  }>;
}): PublicMenuProduct {
  const parts = partitionProductAddons({
    productAddons: product.productAddons.map((link) => ({
      addon: {
        id: link.addon.id,
        name: link.addon.name,
        priceCents: link.addon.priceCents,
        active: link.addon.active,
      },
    })),
    addonGroups: product.addonGroups.map((group) => ({
      id: group.id,
      name: group.name,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
      active: group.active,
      sortOrder: group.sortOrder,
      options: group.options.map((option) => ({
        sortOrder: option.sortOrder,
        addon: {
          id: option.addon.id,
          name: option.addon.name,
          priceCents: option.addon.priceCents,
          active: option.addon.active,
        },
      })),
    })),
  });

  const addonMeta = new Map<string, { sortOrder: number }>();
  for (const link of product.productAddons) {
    addonMeta.set(link.addon.id, { sortOrder: link.addon.sortOrder });
  }
  for (const group of product.addonGroups) {
    for (const option of group.options) {
      addonMeta.set(option.addon.id, { sortOrder: option.addon.sortOrder });
    }
  }

  const independentAddons: PublicMenuAddon[] = parts.independentAddons
    .map((addon) => ({
      id: addon.id,
      name: addon.name,
      priceCents: addon.priceCents,
      sortOrder: addonMeta.get(addon.id)?.sortOrder ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const addonGroups: PublicMenuAddonGroup[] = parts.activeGroups.map((group) => {
    const source = product.addonGroups.find((row) => row.id === group.id);
    return {
      id: group.id,
      name: group.name,
      description: source?.description ?? null,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
      sortOrder: group.sortOrder,
      options: group.options.map((option) => ({
        sortOrder: option.sortOrder,
        addon: {
          id: option.addon.id,
          name: option.addon.name,
          priceCents: option.addon.priceCents,
          sortOrder: option.sortOrder,
        },
      })),
    };
  });

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    imageUrl: product.imageUrl,
    featured: product.featured,
    sortOrder: product.sortOrder,
    available: product.available,
    addons: independentAddons,
    addonGroups,
  };
}

export async function getPublicMenuBySlug(
  slug: string,
): Promise<PublicMenu | null> {
  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isOpen: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryFeeCents: true,
      minimumOrderAmountCents: true,
      openingHours: true,
      address: true,
      categories: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          sortOrder: true,
          products: {
            where: { active: true },
            orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
            select: {
              id: true,
              name: true,
              description: true,
              priceCents: true,
              imageUrl: true,
              featured: true,
              sortOrder: true,
              available: true,
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
                  description: true,
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
                          sortOrder: true,
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
      },
    },
  });

  if (!store) {
    return null;
  }

  const categories: PublicMenuCategory[] = store.categories
    .filter((category) => category.products.length > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      products: category.products.map((product) => mapPublicProduct(product)),
    }));

  const featuredProducts: PublicMenuProduct[] = categories
    .flatMap((category) => category.products)
    .filter((product) => product.featured)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const publicStore: PublicMenuStore = {
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description,
    isOpen: store.isOpen,
    pickupEnabled: store.pickupEnabled,
    deliveryEnabled: store.deliveryEnabled,
    deliveryFeeCents: store.deliveryFeeCents,
    minimumOrderAmountCents: store.minimumOrderAmountCents,
    openingHours: store.openingHours,
    address: store.address,
  };

  return {
    store: publicStore,
    categories,
    featuredProducts,
  };
}
