import { prisma } from "@/lib/prisma";
import type {
  PublicMenu,
  PublicMenuCategory,
  PublicMenuProduct,
  PublicMenuStore,
} from "@/features/menu/menu.types";

export type {
  PublicMenu,
  PublicMenuAddon,
  PublicMenuCategory,
  PublicMenuProduct,
  PublicMenuStore,
} from "@/features/menu/menu.types";

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
      products: category.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        featured: product.featured,
        sortOrder: product.sortOrder,
        available: product.available,
        addons: product.productAddons
          .map((link) => link.addon)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      })),
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
