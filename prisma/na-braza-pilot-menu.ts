import type { PrismaClient } from "@prisma/client";

export const NA_BRAZA_STORE_SLUG = "na-brasa";
export const PILOT_BURGER_PRODUCT_NAME = "Pão Carne Queijo";

export const PILOT_BURGER_ADDON_NAMES = [
  "Bacon extra",
  "Salada",
  "Cheddar extra",
  "Queijo prato extra",
  "Hambúrguer extra",
] as const;

/** Legacy generic cheese addon kept inactive for historical snapshots. */
export const PILOT_LEGACY_INACTIVE_ADDON_NAMES = ["Queijo extra"] as const;

const BEER_AGE_DESCRIPTION =
  "Produto permitido apenas para maiores de 18 anos.";

export type PilotCategorySeed = {
  name: string;
  description: string;
  sortOrder: number;
};

export type PilotAddonSeed = {
  name: string;
  description: string;
  priceCents: number;
  sortOrder: number;
};

export type PilotProductSeed = {
  name: string;
  categoryName: string;
  description: string;
  priceCents: number;
  featured?: boolean;
  sortOrder: number;
};

export const PILOT_CATEGORIES: PilotCategorySeed[] = [
  {
    name: "Lanches artesanais",
    description: "Lanches artesanais feitos na brasa.",
    sortOrder: 1,
  },
  {
    name: "Espetinhos na Brasa",
    description: "Espetinhos grelhados na brasa.",
    sortOrder: 2,
  },
  {
    name: "Bebidas",
    description: "Refrigerantes, água e similares.",
    sortOrder: 3,
  },
  {
    name: "Cervejas",
    description: "Cervejas — somente para maiores de 18 anos.",
    sortOrder: 4,
  },
];

export const PILOT_ADDONS: PilotAddonSeed[] = [
  {
    name: "Bacon extra",
    description: "Porção extra de bacon crocante.",
    priceCents: 500,
    sortOrder: 1,
  },
  {
    name: "Salada",
    description: "Salada fresca para o lanche.",
    priceCents: 500,
    sortOrder: 2,
  },
  {
    name: "Cheddar extra",
    description:
      "Fatia extra de cheddar. Escolha apenas uma opção de queijo extra.",
    priceCents: 300,
    sortOrder: 3,
  },
  {
    name: "Queijo prato extra",
    description:
      "Fatia extra de queijo prato. Escolha apenas uma opção de queijo extra.",
    priceCents: 300,
    sortOrder: 4,
  },
  {
    name: "Hambúrguer extra",
    description: "Hambúrguer artesanal adicional 160g.",
    priceCents: 1500,
    sortOrder: 5,
  },
];

export const PILOT_PRODUCTS: PilotProductSeed[] = [
  {
    name: PILOT_BURGER_PRODUCT_NAME,
    categoryName: "Lanches artesanais",
    description:
      "Hambúrguer artesanal 160g com pão, carne e queijo. Personalize com adicionais. Escolha apenas uma opção de queijo extra.",
    priceCents: 2500,
    featured: true,
    sortOrder: 1,
  },
  {
    name: "Espetinho de Carne",
    categoryName: "Espetinhos na Brasa",
    description: "Espetinho na brasa com aproximadamente 100g.",
    priceCents: 1300,
    featured: true,
    sortOrder: 1,
  },
  {
    name: "Espetinho de Linguiça",
    categoryName: "Espetinhos na Brasa",
    description: "Espetinho de linguiça preparado na brasa.",
    priceCents: 1300,
    featured: true,
    sortOrder: 2,
  },
  {
    name: "Espetinho de Coração",
    categoryName: "Espetinhos na Brasa",
    description: "Espetinho de coração preparado na brasa.",
    priceCents: 1300,
    featured: true,
    sortOrder: 3,
  },
  {
    name: "Espetinho Misto Carne com Frango",
    categoryName: "Espetinhos na Brasa",
    description:
      "Espetinho misto de carne com frango preparado na brasa.",
    priceCents: 1300,
    sortOrder: 4,
  },
  {
    name: "Coca-Cola 350ml",
    categoryName: "Bebidas",
    description: "Lata 350ml.",
    priceCents: 700,
    featured: true,
    sortOrder: 1,
  },
  {
    name: "Guaraná Antarctica 350ml",
    categoryName: "Bebidas",
    description: "Lata 350ml.",
    priceCents: 700,
    sortOrder: 2,
  },
  {
    name: "Coca-Cola 600ml",
    categoryName: "Bebidas",
    description: "Garrafa 600ml.",
    priceCents: 1000,
    featured: true,
    sortOrder: 3,
  },
  {
    name: "Coca-Cola 2L",
    categoryName: "Bebidas",
    description: "Garrafa 2L.",
    priceCents: 1690,
    sortOrder: 4,
  },
  {
    name: "Guaraná Antarctica 1L",
    categoryName: "Bebidas",
    description: "Garrafa 1L.",
    priceCents: 1090,
    sortOrder: 5,
  },
  {
    name: "Guaraná Antarctica 2L",
    categoryName: "Bebidas",
    description: "Garrafa 2L.",
    priceCents: 1690,
    sortOrder: 6,
  },
  {
    name: "Água mineral sem gás 500ml",
    categoryName: "Bebidas",
    description: "Garrafa 500ml.",
    priceCents: 500,
    sortOrder: 7,
  },
  {
    name: "Budweiser Long Neck 330ml",
    categoryName: "Cervejas",
    description: BEER_AGE_DESCRIPTION,
    priceCents: 1000,
    sortOrder: 1,
  },
  {
    name: "Heineken Long Neck 330ml",
    categoryName: "Cervejas",
    description: BEER_AGE_DESCRIPTION,
    priceCents: 1000,
    sortOrder: 2,
  },
  {
    name: "Stella Artois 330ml",
    categoryName: "Cervejas",
    description: BEER_AGE_DESCRIPTION,
    priceCents: 1000,
    sortOrder: 3,
  },
  {
    name: "Stella Artois Sem Glúten 330ml",
    categoryName: "Cervejas",
    description: BEER_AGE_DESCRIPTION,
    priceCents: 1200,
    sortOrder: 4,
  },
  {
    name: "Corona Long Neck 330ml",
    categoryName: "Cervejas",
    description: BEER_AGE_DESCRIPTION,
    priceCents: 1100,
    sortOrder: 5,
  },
];

export function pilotCategoryNameSet(): Set<string> {
  return new Set(PILOT_CATEGORIES.map((c) => c.name));
}

export function pilotAddonNameSet(): Set<string> {
  return new Set(PILOT_ADDONS.map((a) => a.name));
}

export function pilotProductNameSet(): Set<string> {
  return new Set(PILOT_PRODUCTS.map((p) => p.name));
}

export type HideNonPilotCatalogSummary = {
  categoriesEnsuredInactive: number;
  addonsEnsuredInactive: number;
  productsEnsuredInactiveUnavailable: number;
};

/**
 * Ensures catalog rows outside the pilot name sets are hidden (no deletes).
 * Does not create or update pilot items; safe to run after menu:apply.
 */
export async function hideNonPilotCatalogForStore(
  prisma: PrismaClient,
  storeId: string,
  apply: boolean,
): Promise<HideNonPilotCatalogSummary> {
  const summary: HideNonPilotCatalogSummary = {
    categoriesEnsuredInactive: 0,
    addonsEnsuredInactive: 0,
    productsEnsuredInactiveUnavailable: 0,
  };

  const pilotCategoryNames = pilotCategoryNameSet();
  const categories = await prisma.category.findMany({
    where: { storeId },
    select: { id: true, name: true, active: true },
  });
  for (const row of categories) {
    if (pilotCategoryNames.has(row.name) || !row.active) {
      continue;
    }
    if (apply) {
      await prisma.category.update({
        where: { id: row.id },
        data: { active: false },
      });
    }
    summary.categoriesEnsuredInactive += 1;
  }

  const pilotAddonNames = pilotAddonNameSet();
  const addons = await prisma.addon.findMany({
    where: { storeId },
    select: { id: true, name: true, active: true },
  });
  for (const row of addons) {
    if (pilotAddonNames.has(row.name) || !row.active) {
      continue;
    }
    if (apply) {
      await prisma.addon.update({
        where: { id: row.id },
        data: { active: false },
      });
    }
    summary.addonsEnsuredInactive += 1;
  }

  const pilotProductNames = pilotProductNameSet();
  const products = await prisma.product.findMany({
    where: { storeId },
    select: { id: true, name: true, active: true, available: true },
  });
  for (const row of products) {
    if (pilotProductNames.has(row.name)) {
      continue;
    }
    if (row.active || row.available) {
      if (apply) {
        await prisma.product.update({
          where: { id: row.id },
          data: { active: false, available: false },
        });
      }
      summary.productsEnsuredInactiveUnavailable += 1;
    }
  }

  return summary;
}

export type ApplyNaBrazaPilotMenuSummary = {
  storeId: string;
  categoriesCreated: number;
  categoriesUpdated: number;
  categoriesDeactivated: number;
  addonsCreated: number;
  addonsUpdated: number;
  addonsDeactivated: number;
  productsCreated: number;
  productsUpdated: number;
  productsDeactivated: number;
  burgerAddonLinksEnsured: number;
  burgerAddonLinksRemoved: number;
};

export async function applyNaBrazaPilotMenu(
  prisma: PrismaClient,
  storeId: string,
): Promise<ApplyNaBrazaPilotMenuSummary> {
  const summary: ApplyNaBrazaPilotMenuSummary = {
    storeId,
    categoriesCreated: 0,
    categoriesUpdated: 0,
    categoriesDeactivated: 0,
    addonsCreated: 0,
    addonsUpdated: 0,
    addonsDeactivated: 0,
    productsCreated: 0,
    productsUpdated: 0,
    productsDeactivated: 0,
    burgerAddonLinksEnsured: 0,
    burgerAddonLinksRemoved: 0,
  };

  const categoryIdsByName = new Map<string, string>();

  for (const category of PILOT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { storeId, name: category.name },
    });

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          description: category.description,
          sortOrder: category.sortOrder,
          active: true,
        },
      });
      categoryIdsByName.set(category.name, existing.id);
      summary.categoriesUpdated += 1;
    } else {
      const created = await prisma.category.create({
        data: {
          storeId,
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
          active: true,
        },
      });
      categoryIdsByName.set(category.name, created.id);
      summary.categoriesCreated += 1;
    }
  }

  const pilotCategoryNames = pilotCategoryNameSet();
  const staleCategories = await prisma.category.findMany({
    where: { storeId, active: true },
    select: { id: true, name: true },
  });
  for (const row of staleCategories) {
    if (!pilotCategoryNames.has(row.name)) {
      await prisma.category.update({
        where: { id: row.id },
        data: { active: false },
      });
      summary.categoriesDeactivated += 1;
    }
  }

  const addonIdsByName = new Map<string, string>();

  for (const addon of PILOT_ADDONS) {
    const existing = await prisma.addon.findFirst({
      where: { storeId, name: addon.name },
    });

    if (existing) {
      await prisma.addon.update({
        where: { id: existing.id },
        data: {
          description: addon.description,
          priceCents: addon.priceCents,
          sortOrder: addon.sortOrder,
          active: true,
        },
      });
      addonIdsByName.set(addon.name, existing.id);
      summary.addonsUpdated += 1;
    } else {
      const created = await prisma.addon.create({
        data: {
          storeId,
          name: addon.name,
          description: addon.description,
          priceCents: addon.priceCents,
          sortOrder: addon.sortOrder,
          active: true,
        },
      });
      addonIdsByName.set(addon.name, created.id);
      summary.addonsCreated += 1;
    }
  }

  const pilotAddonNames = pilotAddonNameSet();
  const legacyInactiveAddonNames = new Set<string>(
    PILOT_LEGACY_INACTIVE_ADDON_NAMES,
  );
  const staleAddons = await prisma.addon.findMany({
    where: { storeId, active: true },
    select: { id: true, name: true },
  });
  for (const row of staleAddons) {
    if (!pilotAddonNames.has(row.name)) {
      await prisma.addon.update({
        where: { id: row.id },
        data: { active: false },
      });
      summary.addonsDeactivated += 1;
    }
  }

  // Keep known legacy addons inactive without renaming (preserves order snapshots).
  for (const legacyName of legacyInactiveAddonNames) {
    const legacy = await prisma.addon.findFirst({
      where: { storeId, name: legacyName },
      select: { id: true, active: true },
    });
    if (legacy?.active) {
      await prisma.addon.update({
        where: { id: legacy.id },
        data: { active: false },
      });
      summary.addonsDeactivated += 1;
    }
  }

  for (const product of PILOT_PRODUCTS) {
    const categoryId = categoryIdsByName.get(product.categoryName);
    if (!categoryId) {
      throw new Error(
        `Pilot category not resolved for product: ${product.name}`,
      );
    }

    const existing = await prisma.product.findFirst({
      where: { storeId, name: product.name },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          categoryId,
          description: product.description,
          priceCents: product.priceCents,
          featured: product.featured ?? false,
          sortOrder: product.sortOrder,
          active: true,
          available: true,
        },
      });
      summary.productsUpdated += 1;
    } else {
      await prisma.product.create({
        data: {
          storeId,
          categoryId,
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          featured: product.featured ?? false,
          sortOrder: product.sortOrder,
          active: true,
          available: true,
        },
      });
      summary.productsCreated += 1;
    }
  }

  const pilotProductNames = pilotProductNameSet();
  const staleProducts = await prisma.product.findMany({
    where: { storeId, OR: [{ active: true }, { available: true }] },
    select: { id: true, name: true },
  });
  for (const row of staleProducts) {
    if (!pilotProductNames.has(row.name)) {
      await prisma.product.update({
        where: { id: row.id },
        data: { active: false, available: false },
      });
      summary.productsDeactivated += 1;
    }
  }

  const burger = await prisma.product.findFirst({
    where: { storeId, name: PILOT_BURGER_PRODUCT_NAME },
    select: { id: true },
  });
  if (!burger) {
    throw new Error(
      `Pilot burger product "${PILOT_BURGER_PRODUCT_NAME}" not found after apply.`,
    );
  }

  const desiredAddonIds = PILOT_BURGER_ADDON_NAMES.map((name) => {
    const id = addonIdsByName.get(name);
    if (!id) {
      throw new Error(`Pilot addon not resolved: ${name}`);
    }
    return id;
  });

  for (const addonId of desiredAddonIds) {
    await prisma.productAddon.upsert({
      where: {
        productId_addonId: { productId: burger.id, addonId },
      },
      create: { productId: burger.id, addonId },
      update: {},
    });
    summary.burgerAddonLinksEnsured += 1;
  }

  const existingLinks = await prisma.productAddon.findMany({
    where: { productId: burger.id },
    select: { addonId: true },
  });
  const desiredSet = new Set(desiredAddonIds);
  for (const link of existingLinks) {
    if (!desiredSet.has(link.addonId)) {
      await prisma.productAddon.delete({
        where: {
          productId_addonId: {
            productId: burger.id,
            addonId: link.addonId,
          },
        },
      });
      summary.burgerAddonLinksRemoved += 1;
    }
  }

  return summary;
}
