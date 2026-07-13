import { prisma } from "@/lib/prisma";

export type PublicMenuProduct = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  featured: boolean;
  sortOrder: number;
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  products: PublicMenuProduct[];
};

export type PublicMenuStore = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isOpen: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeCents: number;
  minimumOrderAmountCents: number;
  openingHours: string | null;
  address: string | null;
};

export type PublicMenu = {
  store: PublicMenuStore;
  categories: PublicMenuCategory[];
  featuredProducts: PublicMenuProduct[];
};

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
            },
          },
        },
      },
    },
  });

  if (!store) {
    return null;
  }

  const categories = store.categories
    .filter((category) => category.products.length > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      products: category.products,
    }));

  const featuredProducts = categories
    .flatMap((category) => category.products)
    .filter((product) => product.featured)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    store: {
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
    },
    categories,
    featuredProducts,
  };
}
