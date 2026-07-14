import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const STORE_SLUG = "na-brasa";
const WHATSAPP_PLACEHOLDER = "5513999999999";
const BCRYPT_ROUNDS = 10;

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

/**
 * Bootstrap Store only — never overwrites operational fields on an existing row.
 * Placeholder WhatsApp / address / fees apply only on first create.
 */
async function ensureStore() {
  const existing = await prisma.store.findUnique({
    where: { slug: STORE_SLUG },
  });

  if (existing) {
    console.log(
      `[seed] Store "${STORE_SLUG}" already exists — preserving operational data (whatsapp, address, fees, hours, flags).`,
    );
    return { store: existing, created: false };
  }

  const store = await prisma.store.create({
    data: {
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
  });

  console.log(
    `[seed] Store "${STORE_SLUG}" created (bootstrap placeholders). Update real WhatsApp/address/fees in the database before client use.`,
  );
  return { store, created: true };
}

/**
 * Optional, idempotent MASTER user bootstrap (ADR 0002).
 * Requires MASTER_ADMIN_NAME, MASTER_ADMIN_EMAIL, MASTER_ADMIN_PASSWORD.
 * Never logs the password. Does not use ADMIN_EMAIL / ADMIN_PASSWORD.
 */
async function upsertMasterUser(): Promise<{ seeded: boolean; email?: string }> {
  const name = process.env.MASTER_ADMIN_NAME?.trim();
  const email = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.MASTER_ADMIN_PASSWORD;

  const missing: string[] = [];
  if (!name) missing.push("MASTER_ADMIN_NAME");
  if (!email) missing.push("MASTER_ADMIN_EMAIL");
  if (!password) missing.push("MASTER_ADMIN_PASSWORD");

  if (missing.length > 0) {
    console.warn(
      `[seed] Skipping MASTER user bootstrap — missing env(s): ${missing.join(", ")}. Catalog seed continues.`,
    );
    return { seeded: false };
  }

  const passwordHash = await bcrypt.hash(password!, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: email! },
    create: {
      name: name!,
      email: email!,
      passwordHash,
      role: UserRole.MASTER,
      storeId: null,
      isActive: true,
    },
    update: {
      name: name!,
      passwordHash,
      role: UserRole.MASTER,
      storeId: null,
      isActive: true,
    },
    select: { email: true, role: true },
  });

  console.log(`[seed] MASTER user upserted (email set, password not logged).`);
  return { seeded: true, email: user.email };
}

/**
 * Idempotent catalog bootstrap: create missing categories only.
 * Does not overwrite description/sortOrder/active of existing rows.
 */
async function ensureCategories(storeId: string) {
  const byName = new Map<string, { id: string; name: string }>();

  for (const category of categories) {
    const existing = await prisma.category.findFirst({
      where: { storeId, name: category.name },
    });

    if (existing) {
      byName.set(category.name, existing);
      continue;
    }

    const record = await prisma.category.create({
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

/**
 * Idempotent catalog bootstrap: create missing addons only.
 * Does not overwrite price/description of existing addons.
 */
async function ensureAddons(storeId: string) {
  const byName = new Map<string, { id: string; name: string }>();

  for (const addon of addons) {
    const existing = await prisma.addon.findFirst({
      where: { storeId, name: addon.name },
    });

    if (existing) {
      byName.set(addon.name, existing);
      continue;
    }

    const record = await prisma.addon.create({
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

/**
 * Idempotent catalog bootstrap: create missing products + their addon links only.
 * Existing products (and their ProductAddon links) are left unchanged.
 */
async function ensureProducts(
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

    if (existing) {
      continue;
    }

    const record = await prisma.product.create({
      data: {
        storeId,
        categoryId: category.id,
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        featured: product.featured ?? false,
        sortOrder: product.sortOrder,
        active: true,
        available: true,
      },
    });

    const desiredAddonIds = (product.addonNames ?? [])
      .map((name) => {
        const addon = addonsByName.get(name);
        if (!addon) {
          throw new Error(`Addon not found: ${name}`);
        }
        return addon.id;
      });

    if (desiredAddonIds.length > 0) {
      await prisma.productAddon.createMany({
        data: desiredAddonIds.map((addonId) => ({
          productId: record.id,
          addonId,
        })),
        skipDuplicates: true,
      });
    }
  }
}

async function main() {
  console.log("Seeding Na Brasa (idempotent, production-safe bootstrap)...");

  const master = await upsertMasterUser();
  const { store, created: storeCreated } = await ensureStore();
  const categoriesByName = await ensureCategories(store.id);
  const addonsByName = await ensureAddons(store.id);
  await ensureProducts(store.id, categoriesByName, addonsByName);

  const summary = {
    store: store.slug,
    storeCreated,
    storeDataPreserved: !storeCreated,
    whatsappIsPlaceholder: store.whatsapp === WHATSAPP_PLACEHOLDER,
    masterUserSeeded: master.seeded,
    categories: await prisma.category.count({ where: { storeId: store.id } }),
    products: await prisma.product.count({ where: { storeId: store.id } }),
    addons: await prisma.addon.count({ where: { storeId: store.id } }),
    productAddons: await prisma.productAddon.count({
      where: { product: { storeId: store.id } },
    }),
    orders: await prisma.order.count({ where: { storeId: store.id } }),
    users: await prisma.user.count(),
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
