import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const STORE_SLUG = "na-brasa";
const WHATSAPP_PLACEHOLDER = "5513999999999";

const categories = [
  {
    name: "Lanches Artesanais",
    description: "Burgers e lanches feitos na brasa.",
    sortOrder: 1,
  },
  {
    name: "Espetinhos",
    description: "Espetinhos grelhados na hora.",
    sortOrder: 2,
  },
  {
    name: "Combos",
    description: "Combinações com acompanhamento e bebida.",
    sortOrder: 3,
  },
  {
    name: "Acompanhamentos",
    description: "Porções para acompanhar o pedido.",
    sortOrder: 4,
  },
  {
    name: "Bebidas",
    description: "Refrigerantes, água e similares.",
    sortOrder: 5,
  },
  {
    name: "Adicionais",
    description: "Extras para personalizar o lanche.",
    sortOrder: 6,
  },
] as const;

type SeedProduct = {
  name: string;
  description: string;
  categoryName: (typeof categories)[number]["name"];
  priceCents: number;
  featured?: boolean;
  sortOrder: number;
  addonNames?: string[];
};

const products: SeedProduct[] = [
  {
    name: "Burger Na Brasa",
    description: "Blend artesanal grelhado na brasa, queijo, alface e molho da casa.",
    categoryName: "Lanches Artesanais",
    priceCents: 2890,
    featured: true,
    sortOrder: 1,
    addonNames: ["Bacon extra", "Cheddar", "Ovo", "Queijo extra", "Molho da casa"],
  },
  {
    name: "Burger Bacon Cheddar",
    description: "Burger na brasa com bacon crocante e cheddar cremoso.",
    categoryName: "Lanches Artesanais",
    priceCents: 3290,
    featured: true,
    sortOrder: 2,
    addonNames: ["Bacon extra", "Cheddar", "Ovo", "Queijo extra", "Molho da casa"],
  },
  {
    name: "X-Salada Artesanal",
    description: "Pão macio, blend, queijo, salada fresca e molho especial.",
    categoryName: "Lanches Artesanais",
    priceCents: 2590,
    sortOrder: 3,
    addonNames: ["Bacon extra", "Cheddar", "Ovo", "Queijo extra", "Molho da casa"],
  },
  {
    name: "Espetinho de Carne",
    description: "Espetinho de carne temperado e grelhado na brasa.",
    categoryName: "Espetinhos",
    priceCents: 1200,
    featured: true,
    sortOrder: 1,
  },
  {
    name: "Espetinho de Frango",
    description: "Espetinho de frango suculento na brasa.",
    categoryName: "Espetinhos",
    priceCents: 1000,
    sortOrder: 2,
  },
  {
    name: "Espetinho de Linguiça",
    description: "Linguiça artesanal grelhada no espeto.",
    categoryName: "Espetinhos",
    priceCents: 1100,
    sortOrder: 3,
  },
  {
    name: "Pão de Alho",
    description: "Pão de alho crocante para acompanhar.",
    categoryName: "Acompanhamentos",
    priceCents: 800,
    sortOrder: 1,
  },
  {
    name: "Batata Frita",
    description: "Porção de batata frita crocante.",
    categoryName: "Acompanhamentos",
    priceCents: 1500,
    sortOrder: 2,
  },
  {
    name: "Refrigerante Lata",
    description: "Lata 350ml (sabores variados).",
    categoryName: "Bebidas",
    priceCents: 700,
    sortOrder: 1,
  },
  {
    name: "Água Mineral",
    description: "Água mineral 500ml.",
    categoryName: "Bebidas",
    priceCents: 400,
    sortOrder: 2,
  },
];

const addons = [
  {
    name: "Bacon extra",
    description: "Porção extra de bacon crocante.",
    priceCents: 500,
    sortOrder: 1,
  },
  {
    name: "Cheddar",
    description: "Cheddar cremoso.",
    priceCents: 400,
    sortOrder: 2,
  },
  {
    name: "Ovo",
    description: "Ovo frito.",
    priceCents: 300,
    sortOrder: 3,
  },
  {
    name: "Queijo extra",
    description: "Fatia extra de queijo.",
    priceCents: 350,
    sortOrder: 4,
  },
  {
    name: "Molho da casa",
    description: "Molho especial Na Brasa.",
    priceCents: 200,
    sortOrder: 5,
  },
] as const;

async function upsertStore() {
  return prisma.store.upsert({
    where: { slug: STORE_SLUG },
    create: {
      name: "Na Brasa",
      slug: STORE_SLUG,
      description:
        "Carrinho de lanches artesanais e espetinhos feitos na brasa.",
      whatsapp: WHATSAPP_PLACEHOLDER,
      address: "Ponto fixo — endereço fictício para desenvolvimento",
      openingHours: "Ter–Dom 18:00–23:30",
      isOpen: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryFeeCents: 500,
      minimumOrderAmountCents: 2000,
    },
    update: {
      name: "Na Brasa",
      description:
        "Carrinho de lanches artesanais e espetinhos feitos na brasa.",
      whatsapp: WHATSAPP_PLACEHOLDER,
      address: "Ponto fixo — endereço fictício para desenvolvimento",
      openingHours: "Ter–Dom 18:00–23:30",
      isOpen: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryFeeCents: 500,
      minimumOrderAmountCents: 2000,
    },
  });
}

async function upsertCategories(storeId: string) {
  const byName = new Map<string, { id: string; name: string }>();

  for (const category of categories) {
    const existing = await prisma.category.findFirst({
      where: { storeId, name: category.name },
    });

    const record = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: {
            description: category.description,
            sortOrder: category.sortOrder,
            active: true,
          },
        })
      : await prisma.category.create({
          data: {
            storeId,
            name: category.name,
            description: category.description,
            sortOrder: category.sortOrder,
            active: true,
          },
        });

    byName.set(category.name, record);
  }

  return byName;
}

async function upsertAddons(storeId: string) {
  const byName = new Map<string, { id: string; name: string }>();

  for (const addon of addons) {
    const existing = await prisma.addon.findFirst({
      where: { storeId, name: addon.name },
    });

    const record = existing
      ? await prisma.addon.update({
          where: { id: existing.id },
          data: {
            description: addon.description,
            priceCents: addon.priceCents,
            sortOrder: addon.sortOrder,
            active: true,
          },
        })
      : await prisma.addon.create({
          data: {
            storeId,
            name: addon.name,
            description: addon.description,
            priceCents: addon.priceCents,
            sortOrder: addon.sortOrder,
            active: true,
          },
        });

    byName.set(addon.name, record);
  }

  return byName;
}

async function upsertProducts(
  storeId: string,
  categoriesByName: Map<string, { id: string; name: string }>,
  addonsByName: Map<string, { id: string; name: string }>,
) {
  for (const product of products) {
    const category = categoriesByName.get(product.categoryName);
    if (!category) {
      throw new Error(`Category not found for product: ${product.name}`);
    }

    const existing = await prisma.product.findFirst({
      where: { storeId, name: product.name },
    });

    const data: Prisma.ProductUpdateInput = {
      category: { connect: { id: category.id } },
      description: product.description,
      priceCents: product.priceCents,
      featured: product.featured ?? false,
      sortOrder: product.sortOrder,
      active: true,
    };

    const record = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.product.create({
          data: {
            storeId,
            categoryId: category.id,
            name: product.name,
            description: product.description,
            priceCents: product.priceCents,
            featured: product.featured ?? false,
            sortOrder: product.sortOrder,
            active: true,
          },
        });

    const desiredAddonIds = (product.addonNames ?? [])
      .map((name) => {
        const addon = addonsByName.get(name);
        if (!addon) {
          throw new Error(`Addon not found: ${name}`);
        }
        return addon.id;
      })
      .sort();

    const currentLinks = await prisma.productAddon.findMany({
      where: { productId: record.id },
      select: { addonId: true },
    });
    const currentAddonIds = currentLinks.map((link) => link.addonId).sort();

    const toRemove = currentAddonIds.filter((id) => !desiredAddonIds.includes(id));
    const toAdd = desiredAddonIds.filter((id) => !currentAddonIds.includes(id));

    if (toRemove.length > 0) {
      await prisma.productAddon.deleteMany({
        where: {
          productId: record.id,
          addonId: { in: toRemove },
        },
      });
    }

    if (toAdd.length > 0) {
      await prisma.productAddon.createMany({
        data: toAdd.map((addonId) => ({
          productId: record.id,
          addonId,
        })),
        skipDuplicates: true,
      });
    }
  }
}

async function main() {
  console.log("Seeding Na Brasa (idempotent)...");

  const store = await upsertStore();
  const categoriesByName = await upsertCategories(store.id);
  const addonsByName = await upsertAddons(store.id);
  await upsertProducts(store.id, categoriesByName, addonsByName);

  const summary = {
    store: store.slug,
    whatsappPlaceholder: store.whatsapp,
    categories: await prisma.category.count({ where: { storeId: store.id } }),
    products: await prisma.product.count({ where: { storeId: store.id } }),
    addons: await prisma.addon.count({ where: { storeId: store.id } }),
    productAddons: await prisma.productAddon.count({
      where: { product: { storeId: store.id } },
    }),
    orders: await prisma.order.count({ where: { storeId: store.id } }),
  };

  console.log("Seed completed:", summary);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
