import { Prisma, PrismaClient, UserRole } from "@prisma/client";
import {
  NA_BRAZA_STORE_SLUG,
  pilotAddonNameSet,
  pilotCategoryNameSet,
  pilotProductNameSet,
} from "../prisma/na-braza-pilot-menu";

const PROTECTED_OWNER_EMAIL = "theluksvm@gmail.com";
const CONFIRM_ENV = "CONFIRM_PURGE_NA_BRAZA_TEST_RECORDS";

const KNOWN_TEST_ORDER_CODES = [
  "NB-676933-790",
  "NB-117566-824",
  "NB-120091-947",
  "NB-303614-486",
] as const;

const pilotProductNames = pilotProductNameSet();
const pilotCategoryNames = pilotCategoryNameSet();
const pilotAddonNames = pilotAddonNameSet();

function isApplyMode(): boolean {
  return process.env[CONFIRM_ENV] === "true";
}

function containsInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function matchesTechnicalProductName(name: string): boolean {
  return (
    containsInsensitive(name, "E2E") ||
    containsInsensitive(name, "Smoke") ||
    containsInsensitive(name, "Playwright") ||
    containsInsensitive(name, "Produto técnico")
  );
}

function matchesTechnicalCategoryName(name: string): boolean {
  return (
    containsInsensitive(name, "E2E") ||
    containsInsensitive(name, "Smoke") ||
    containsInsensitive(name, "Playwright") ||
    containsInsensitive(name, "Category")
  );
}

function matchesTechnicalAddonName(name: string): boolean {
  return (
    containsInsensitive(name, "E2E") ||
    containsInsensitive(name, "Smoke") ||
    containsInsensitive(name, "Playwright")
  );
}

export function buildPurgeOrderWhere(storeId: string): Prisma.OrderWhereInput {
  return {
    storeId,
    OR: [
      { code: { in: [...KNOWN_TEST_ORDER_CODES] } },
      { customerName: { contains: "Smoke", mode: "insensitive" } },
      { customerName: { contains: "E2E", mode: "insensitive" } },
      { customerName: { contains: "Playwright", mode: "insensitive" } },
    ],
  };
}

export function buildPurgeUserWhere(storeId: string): Prisma.UserWhereInput {
  return {
    storeId,
    role: { not: UserRole.MASTER },
    email: { not: PROTECTED_OWNER_EMAIL.toLowerCase() },
    OR: [
      { email: { endsWith: "@example.com", mode: "insensitive" } },
      { email: { contains: "e2e", mode: "insensitive" } },
      { email: { contains: "smoke", mode: "insensitive" } },
      { email: { contains: "playwright", mode: "insensitive" } },
      { name: { contains: "E2E", mode: "insensitive" } },
      { name: { contains: "Smoke", mode: "insensitive" } },
    ],
  };
}

function assertPilotSafe(
  kind: string,
  names: string[],
  pilotSet: Set<string>,
): void {
  for (const name of names) {
    if (pilotSet.has(name)) {
      throw new Error(
        `Safety abort: ${kind} "${name}" is part of the pilot menu and cannot be purged.`,
      );
    }
  }
}

function assertProtectedUserCandidates(
  users: { email: string; role: UserRole }[],
): void {
  for (const user of users) {
    if (user.email.toLowerCase() === PROTECTED_OWNER_EMAIL.toLowerCase()) {
      throw new Error(
        `Safety abort: protected store owner ${PROTECTED_OWNER_EMAIL} cannot be purged.`,
      );
    }
    if (user.role === UserRole.MASTER) {
      throw new Error(
        `Safety abort: MASTER user ${user.email} cannot be purged.`,
      );
    }
  }
}

function formatMoney(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2)} (${cents} cents)`;
}

function logOrderCandidates(
  orders: {
    code: string;
    status: string;
    customerName: string;
    totalCents: number;
  }[],
): void {
  if (orders.length === 0) {
    console.log("Orders to purge: none.");
    return;
  }
  console.log(`Orders to purge: ${orders.length}`);
  for (const order of orders) {
    console.log(
      `  code=${order.code} | status=${order.status} | customerName=${order.customerName} | total=${formatMoney(order.totalCents)}`,
    );
  }
}

function logProductCandidates(
  products: {
    name: string;
    active: boolean;
    available: boolean;
    priceCents: number;
  }[],
): void {
  if (products.length === 0) {
    console.log("Products to purge: none.");
    return;
  }
  console.log(`Products to purge: ${products.length}`);
  for (const p of products) {
    console.log(
      `  name=${p.name} | active=${p.active} | available=${p.available} | priceCents=${p.priceCents}`,
    );
  }
}

function logCategoryCandidates(
  categories: { name: string; active: boolean }[],
): void {
  if (categories.length === 0) {
    console.log("Categories to purge: none.");
    return;
  }
  console.log(`Categories to purge: ${categories.length}`);
  for (const c of categories) {
    console.log(`  name=${c.name} | active=${c.active}`);
  }
}

function logAddonCandidates(
  addons: { name: string; active: boolean; priceCents: number }[],
): void {
  if (addons.length === 0) {
    console.log("Addons to purge: none.");
    return;
  }
  console.log(`Addons to purge: ${addons.length}`);
  for (const a of addons) {
    console.log(
      `  name=${a.name} | active=${a.active} | priceCents=${a.priceCents}`,
    );
  }
}

function logUserCandidates(
  users: {
    email: string;
    name: string;
    role: UserRole;
    isActive: boolean;
  }[],
): void {
  if (users.length === 0) {
    console.log("Users to purge: none.");
    return;
  }
  console.log(`Users to purge: ${users.length} (delete, or inactive if FK)`);
  for (const user of users) {
    console.log(
      `  email=${user.email} | name=${user.name} | role=${user.role} | isActive=${user.isActive}`,
    );
  }
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}

type PurgeCounts = {
  ordersDeleted: number;
  orderItemsDeleted: number;
  orderItemAddonsDeleted: number;
  productAddonLinksDeleted: number;
  productsDeleted: number;
  addonsDeleted: number;
  categoriesDeleted: number;
  usersDeleted: number;
  usersRetainedInactiveDueToRelations: number;
};

function emptyCounts(): PurgeCounts {
  return {
    ordersDeleted: 0,
    orderItemsDeleted: 0,
    orderItemAddonsDeleted: 0,
    productAddonLinksDeleted: 0,
    productsDeleted: 0,
    addonsDeleted: 0,
    categoriesDeleted: 0,
    usersDeleted: 0,
    usersRetainedInactiveDueToRelations: 0,
  };
}

async function main(): Promise<void> {
  const apply = isApplyMode();
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);

  const prisma = new PrismaClient();
  const counts = emptyCounts();

  try {
    const store = await prisma.store.findUnique({
      where: { slug: NA_BRAZA_STORE_SLUG },
      select: { id: true, slug: true },
    });

    if (!store) {
      throw new Error(
        `Store with slug "${NA_BRAZA_STORE_SLUG}" not found. Aborting.`,
      );
    }

    console.log(`Store id: ${store.id}`);
    console.log(`Store slug: ${store.slug}`);

    const orders = await prisma.order.findMany({
      where: buildPurgeOrderWhere(store.id),
      select: {
        id: true,
        code: true,
        status: true,
        customerName: true,
        totalCents: true,
      },
      orderBy: { createdAt: "desc" },
    });

    logOrderCandidates(orders);

    const testeNamedOrders = await prisma.order.findMany({
      where: {
        storeId: store.id,
        customerName: { contains: "Teste", mode: "insensitive" },
      },
      select: { id: true, code: true, customerName: true },
    });
    const purgeOrderIds = new Set(orders.map((o) => o.id));
    const testeOnlyOrders = testeNamedOrders.filter(
      (o) => !purgeOrderIds.has(o.id),
    );
    if (testeOnlyOrders.length > 0) {
      console.log(
        "WARNING: orders with 'Teste' in customerName are NOT auto-purged (review manually):",
      );
      for (const order of testeOnlyOrders) {
        console.log(`  - ${order.code} | customer=${order.customerName}`);
      }
    }

    const allProducts = await prisma.product.findMany({
      where: { storeId: store.id },
      select: {
        id: true,
        name: true,
        categoryId: true,
        active: true,
        available: true,
        priceCents: true,
      },
    });
    const productCandidates = allProducts.filter(
      (p) =>
        !pilotProductNames.has(p.name) && matchesTechnicalProductName(p.name),
    );

    const allCategories = await prisma.category.findMany({
      where: { storeId: store.id },
      select: { id: true, name: true, active: true },
    });
    const categoryCandidates = allCategories.filter(
      (c) =>
        !pilotCategoryNames.has(c.name) &&
        matchesTechnicalCategoryName(c.name),
    );

    const allAddons = await prisma.addon.findMany({
      where: { storeId: store.id },
      select: { id: true, name: true, active: true, priceCents: true },
    });
    const addonCandidates = allAddons.filter(
      (a) => !pilotAddonNames.has(a.name) && matchesTechnicalAddonName(a.name),
    );

    assertPilotSafe(
      "product",
      productCandidates.map((p) => p.name),
      pilotProductNames,
    );
    assertPilotSafe(
      "category",
      categoryCandidates.map((c) => c.name),
      pilotCategoryNames,
    );
    assertPilotSafe(
      "addon",
      addonCandidates.map((a) => a.name),
      pilotAddonNames,
    );

    const productCandidateIds = new Set(productCandidates.map((p) => p.id));

    for (const category of categoryCandidates) {
      const productsInCategory = allProducts.filter(
        (p) => p.categoryId === category.id,
      );
      const blocking = productsInCategory.filter(
        (p) => !productCandidateIds.has(p.id),
      );
      if (blocking.length > 0) {
        const names = blocking.map((p) => p.name).join(", ");
        throw new Error(
          `Safety abort: category "${category.name}" still has non-purge product(s): ${names}`,
        );
      }
    }

    logProductCandidates(productCandidates);
    logCategoryCandidates(categoryCandidates);
    logAddonCandidates(addonCandidates);

    const users = await prisma.user.findMany({
      where: buildPurgeUserWhere(store.id),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
      orderBy: { email: "asc" },
    });

    assertProtectedUserCandidates(users);
    logUserCandidates(users);

    if (!apply) {
      console.log("--- Summary (dry-run) ---");
      console.log(`Orders: ${orders.length} would be deleted`);
      console.log(`Products: ${productCandidates.length} would be deleted`);
      console.log(`Categories: ${categoryCandidates.length} would be deleted`);
      console.log(`Addons: ${addonCandidates.length} would be deleted`);
      console.log(`Users: ${users.length} would be deleted (or retained inactive)`);
      console.log(
        `No writes performed. Set ${CONFIRM_ENV}=true to apply changes.`,
      );
      return;
    }

    const orderIds = orders.map((o) => o.id);
    if (orderIds.length > 0) {
      const items = await prisma.orderItem.findMany({
        where: { orderId: { in: orderIds } },
        select: { id: true },
      });
      const itemIds = items.map((i) => i.id);

      if (itemIds.length > 0) {
        const addonDelete = await prisma.orderItemAddon.deleteMany({
          where: { orderItemId: { in: itemIds } },
        });
        counts.orderItemAddonsDeleted = addonDelete.count;
      }

      const itemDelete = await prisma.orderItem.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      counts.orderItemsDeleted = itemDelete.count;

      const orderDelete = await prisma.order.deleteMany({
        where: { id: { in: orderIds } },
      });
      counts.ordersDeleted = orderDelete.count;
    }

    const productIds = productCandidates.map((p) => p.id);
    const addonIds = addonCandidates.map((a) => a.id);

    if (productIds.length > 0 || addonIds.length > 0) {
      const linkDelete = await prisma.productAddon.deleteMany({
        where: {
          OR: [
            ...(productIds.length > 0
              ? [{ productId: { in: productIds } }]
              : []),
            ...(addonIds.length > 0 ? [{ addonId: { in: addonIds } }] : []),
          ],
        },
      });
      counts.productAddonLinksDeleted = linkDelete.count;
    }

    if (productIds.length > 0) {
      const productDelete = await prisma.product.deleteMany({
        where: { id: { in: productIds }, storeId: store.id },
      });
      counts.productsDeleted = productDelete.count;
    }

    if (addonIds.length > 0) {
      const addonDelete = await prisma.addon.deleteMany({
        where: { id: { in: addonIds }, storeId: store.id },
      });
      counts.addonsDeleted = addonDelete.count;
    }

    const categoryIds = categoryCandidates.map((c) => c.id);
    if (categoryIds.length > 0) {
      const categoryDelete = await prisma.category.deleteMany({
        where: { id: { in: categoryIds }, storeId: store.id },
      });
      counts.categoriesDeleted = categoryDelete.count;
    }

    for (const user of users) {
      try {
        await prisma.user.delete({ where: { id: user.id } });
        counts.usersDeleted += 1;
      } catch (error: unknown) {
        if (isForeignKeyViolation(error)) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isActive: false },
          });
          counts.usersRetainedInactiveDueToRelations += 1;
          console.log(
            `retainedInactiveDueToRelations: ${user.email}`,
          );
        } else {
          throw error;
        }
      }
    }

    console.log("--- Summary (apply) ---");
    console.log(`ordersDeleted: ${counts.ordersDeleted}`);
    console.log(`orderItemsDeleted: ${counts.orderItemsDeleted}`);
    console.log(`orderItemAddonsDeleted: ${counts.orderItemAddonsDeleted}`);
    console.log(`productAddonLinksDeleted: ${counts.productAddonLinksDeleted}`);
    console.log(`productsDeleted: ${counts.productsDeleted}`);
    console.log(`addonsDeleted: ${counts.addonsDeleted}`);
    console.log(`categoriesDeleted: ${counts.categoriesDeleted}`);
    console.log(`usersDeleted: ${counts.usersDeleted}`);
    console.log(
      `usersRetainedInactiveDueToRelations: ${counts.usersRetainedInactiveDueToRelations}`,
    );
    console.log("Na Braza test records purged for handoff.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
