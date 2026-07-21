import { PrismaClient } from "@prisma/client";
import {
  NA_BRAZA_STORE_SLUG,
  pilotCategoryNameSet,
  pilotProductNameSet,
} from "../prisma/na-braza-pilot-menu";

/**
 * Removes only audited inactive leftover products from the original seed.
 * Keeps the published pilot catalog intact.
 *
 * Dry-run (default):
 *   pnpm exec tsx scripts/remove-na-braza-legacy-seed-products.ts
 *
 * Apply:
 *   CONFIRM_REMOVE_NA_BRAZA_LEGACY_SEED=true pnpm exec tsx scripts/remove-na-braza-legacy-seed-products.ts
 */
const CONFIRM_ENV = "CONFIRM_REMOVE_NA_BRAZA_LEGACY_SEED";

/** Audited inactive leftovers from the original seed (not pilot names). */
const LEGACY_SEED_PRODUCT_NAMES = [
  "Pão de Alho",
  "Burger Na Brasa",
  "Refrigerante Lata",
  "Burger Bacon Cheddar",
  "Espetinho de Frango",
  "Batata Frita",
  "Água Mineral",
  "X-Salada Artesanal",
] as const;

/** Inactive non-pilot categories eligible for removal only when empty. */
const LEGACY_SEED_CATEGORY_NAMES = [
  "Lanches Artesanais",
  "Espetinhos",
  "Combos",
  "Acompanhamentos",
  "Adicionais",
] as const;

function isApplyMode(): boolean {
  return process.env[CONFIRM_ENV] === "true";
}

function assertNoPilotOverlap(): void {
  const pilotProducts = pilotProductNameSet();
  const pilotCategories = pilotCategoryNameSet();

  for (const name of LEGACY_SEED_PRODUCT_NAMES) {
    if (pilotProducts.has(name)) {
      throw new Error(
        `Safety abort: product "${name}" is in the pilot catalog allowlist.`,
      );
    }
  }

  for (const name of LEGACY_SEED_CATEGORY_NAMES) {
    if (pilotCategories.has(name)) {
      throw new Error(
        `Safety abort: category "${name}" is in the pilot catalog allowlist.`,
      );
    }
  }
}

async function main(): Promise<void> {
  const apply = isApplyMode();
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  assertNoPilotOverlap();

  const prisma = new PrismaClient();

  try {
    const store = await prisma.store.findUnique({
      where: { slug: NA_BRAZA_STORE_SLUG },
      select: { id: true, slug: true },
    });
    if (!store) {
      throw new Error(`Store "${NA_BRAZA_STORE_SLUG}" not found. Aborting.`);
    }

    console.log(`Store id: ${store.id}`);
    console.log(`Store slug: ${store.slug}`);

    const products = await prisma.product.findMany({
      where: {
        storeId: store.id,
        name: { in: [...LEGACY_SEED_PRODUCT_NAMES] },
      },
      select: {
        id: true,
        name: true,
        active: true,
        available: true,
        categoryId: true,
        category: { select: { name: true } },
        _count: {
          select: {
            productAddons: true,
            addonGroups: true,
            orderItems: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const foundNames = new Set(products.map((p) => p.name));
    const missingNames = LEGACY_SEED_PRODUCT_NAMES.filter(
      (name) => !foundNames.has(name),
    );
    if (missingNames.length > 0) {
      console.log(
        `Note: ${missingNames.length} audited name(s) not found (already removed?):`,
      );
      for (const name of missingNames) {
        console.log(`  - ${name}`);
      }
    }

    const activeOrAvailable = products.filter((p) => p.active || p.available);
    if (activeOrAvailable.length > 0) {
      console.error("Safety abort: refused to remove active/available products:");
      for (const product of activeOrAvailable) {
        console.error(
          `  - ${product.name} | active=${product.active} available=${product.available}`,
        );
      }
      process.exit(1);
    }

    const pilotProducts = pilotProductNameSet();
    for (const product of products) {
      if (pilotProducts.has(product.name)) {
        throw new Error(
          `Safety abort: candidate "${product.name}" collides with pilot catalog.`,
        );
      }
    }

    console.log(`Legacy products selected: ${products.length}`);
    for (const product of products) {
      console.log(
        `  - ${product.name} | active=${product.active} available=${product.available} | category=${product.category.name} | productAddons=${product._count.productAddons} | addonGroups=${product._count.addonGroups} | orderItems=${product._count.orderItems} (productId will SetNull)`,
      );
    }

    const productIds = products.map((p) => p.id);

    const productAddonLinks =
      productIds.length === 0
        ? 0
        : await prisma.productAddon.count({
            where: { productId: { in: productIds } },
          });
    const addonGroups =
      productIds.length === 0
        ? []
        : await prisma.addonGroup.findMany({
            where: { productId: { in: productIds } },
            select: { id: true, name: true, productId: true },
          });

    console.log(`ProductAddon links to remove: ${productAddonLinks}`);
    console.log(`AddonGroups to remove (cascade options): ${addonGroups.length}`);
    for (const group of addonGroups) {
      console.log(`  - group "${group.name}" (${group.id})`);
    }

    if (apply && productIds.length > 0) {
      await prisma.productAddon.deleteMany({
        where: { productId: { in: productIds } },
      });
      // AddonGroup cascades from Product delete; delete products after links.
      await prisma.product.deleteMany({
        where: { id: { in: productIds }, storeId: store.id },
      });
    }

    const legacyCategories = await prisma.category.findMany({
      where: {
        storeId: store.id,
        name: { in: [...LEGACY_SEED_CATEGORY_NAMES] },
      },
      select: {
        id: true,
        name: true,
        active: true,
        products: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    });

    const removedProductIdSet = new Set(productIds);
    const emptyLegacyCategories = legacyCategories.filter((category) =>
      category.products.every((product) => removedProductIdSet.has(product.id)),
    );

    console.log(
      `Empty legacy categories eligible for removal: ${emptyLegacyCategories.length}`,
    );
    for (const category of emptyLegacyCategories) {
      console.log(
        `  - ${category.name} | active=${category.active} | productsNow=${category.products.length}`,
      );
    }

    if (apply && emptyLegacyCategories.length > 0) {
      await prisma.category.deleteMany({
        where: {
          id: { in: emptyLegacyCategories.map((c) => c.id) },
          storeId: store.id,
        },
      });
    }

    const remainingPilotActive = await prisma.product.count({
      where: {
        storeId: store.id,
        active: true,
        name: { in: [...pilotProductNameSet()] },
      },
    });
    const remainingActive = await prisma.product.count({
      where: { storeId: store.id, active: true },
    });
    const remainingLegacy = await prisma.product.count({
      where: {
        storeId: store.id,
        name: { in: [...LEGACY_SEED_PRODUCT_NAMES] },
      },
    });

    console.log("--- Summary ---");
    console.log(
      apply
        ? `Products deleted: ${products.length}`
        : `Products that would be deleted: ${products.length}`,
    );
    console.log(
      apply
        ? `Empty legacy categories deleted: ${emptyLegacyCategories.length}`
        : `Empty legacy categories that would be deleted: ${emptyLegacyCategories.length}`,
    );
    console.log(`Pilot active products remaining: ${remainingPilotActive}`);
    console.log(`All active products remaining: ${remainingActive}`);
    console.log(`Legacy seed products remaining: ${remainingLegacy}`);

    if (remainingPilotActive < 1) {
      throw new Error(
        "Safety abort: zero active pilot products remaining after operation.",
      );
    }
    if (apply && remainingLegacy > 0) {
      throw new Error(
        "Safety abort: legacy seed products still present after apply.",
      );
    }

    if (!apply) {
      console.log(
        `No writes performed. Set ${CONFIRM_ENV}=true to apply changes.`,
      );
    } else {
      console.log("Legacy seed leftovers removed. Pilot catalog preserved.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
