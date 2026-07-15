import { OrderStatus, Prisma, PrismaClient, UserRole } from "@prisma/client";
import {
  hideNonPilotCatalogForStore,
  NA_BRAZA_STORE_SLUG,
} from "../prisma/na-braza-pilot-menu";

const PROTECTED_OWNER_EMAIL = "theluksvm@gmail.com";
const KNOWN_SMOKE_ORDER_CODE = "NB-676933-790";

const CONFIRM_ENV = "CONFIRM_CLEAN_NA_BRAZA_TEST_DATA";

function isApplyMode(): boolean {
  return process.env[CONFIRM_ENV] === "true";
}

export function buildTestOrderWhere(storeId: string): Prisma.OrderWhereInput {
  return {
    storeId,
    OR: [
      { customerName: { contains: "Smoke", mode: "insensitive" } },
      { customerName: { contains: "E2E", mode: "insensitive" } },
      { customerName: { contains: "Teste", mode: "insensitive" } },
      { customerName: { contains: "Playwright", mode: "insensitive" } },
      { customerPhone: { contains: "999999" } },
      { code: KNOWN_SMOKE_ORDER_CODE },
    ],
  };
}

export function buildTestStoreUserWhere(storeId: string): Prisma.UserWhereInput {
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

type OrderRow = {
  id: string;
  code: string;
  status: OrderStatus;
  customerName: string;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
};

function logOrderCandidates(orders: OrderRow[]): void {
  if (orders.length === 0) {
    console.log("Test orders: none matched criteria.");
    return;
  }
  console.log(`Test orders: ${orders.length} candidate(s):`);
  for (const order of orders) {
    console.log(
      `  - ${order.code} | status=${order.status} | customer=${order.customerName}`,
    );
  }
}

function logUserCandidates(users: UserRow[]): void {
  if (users.length === 0) {
    console.log("Test users: none matched criteria.");
    return;
  }
  console.log(`Test users: ${users.length} candidate(s):`);
  for (const user of users) {
    console.log(
      `  - ${user.email} | active=${user.isActive} | name=${user.name}`,
    );
  }
}

async function main(): Promise<void> {
  const apply = isApplyMode();
  const modeLabel = apply ? "APPLY" : "DRY RUN";
  console.log(`Mode: ${modeLabel}`);

  const prisma = new PrismaClient();

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

    const orderWhere = buildTestOrderWhere(store.id);
    const orders = await prisma.order.findMany({
      where: orderWhere,
      select: {
        id: true,
        code: true,
        status: true,
        customerName: true,
      },
      orderBy: { createdAt: "desc" },
    });

    logOrderCandidates(orders);

    const toCancel = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const alreadyCancelled = orders.length - toCancel.length;

    let ordersCancelled = 0;
    if (apply && toCancel.length > 0) {
      const result = await prisma.order.updateMany({
        where: {
          id: { in: toCancel.map((o) => o.id) },
          status: { not: OrderStatus.CANCELLED },
        },
        data: { status: OrderStatus.CANCELLED },
      });
      ordersCancelled = result.count;
    } else {
      ordersCancelled = apply ? 0 : toCancel.length;
    }

    const userWhere = buildTestStoreUserWhere(store.id);
    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
      orderBy: { email: "asc" },
    });

    logUserCandidates(users);

    const toDeactivate = users.filter((u) => u.isActive);
    const alreadyInactive = users.length - toDeactivate.length;

    let usersDeactivated = 0;
    if (apply && toDeactivate.length > 0) {
      const result = await prisma.user.updateMany({
        where: {
          id: { in: toDeactivate.map((u) => u.id) },
          isActive: true,
        },
        data: { isActive: false },
      });
      usersDeactivated = result.count;
    } else {
      usersDeactivated = apply ? 0 : toDeactivate.length;
    }

    const catalogSummary = await hideNonPilotCatalogForStore(
      prisma,
      store.id,
      apply,
    );

    console.log("--- Summary ---");
    console.log(`Orders matched: ${orders.length}`);
    console.log(
      apply
        ? `Orders cancelled: ${ordersCancelled}`
        : `Orders that would be cancelled: ${toCancel.length}`,
    );
    console.log(`Orders already cancelled: ${alreadyCancelled}`);
    console.log(`Test users matched: ${users.length}`);
    console.log(
      apply
        ? `Users deactivated: ${usersDeactivated}`
        : `Users that would be deactivated: ${toDeactivate.length}`,
    );
    console.log(`Users already inactive: ${alreadyInactive}`);
    console.log(
      apply
        ? `Non-pilot categories set inactive: ${catalogSummary.categoriesEnsuredInactive}`
        : `Non-pilot categories that would be set inactive: ${catalogSummary.categoriesEnsuredInactive}`,
    );
    console.log(
      apply
        ? `Non-pilot addons set inactive: ${catalogSummary.addonsEnsuredInactive}`
        : `Non-pilot addons that would be set inactive: ${catalogSummary.addonsEnsuredInactive}`,
    );
    console.log(
      apply
        ? `Non-pilot products hidden: ${catalogSummary.productsEnsuredInactiveUnavailable}`
        : `Non-pilot products that would be hidden: ${catalogSummary.productsEnsuredInactiveUnavailable}`,
    );

    if (!apply) {
      console.log(
        `No writes performed. Set ${CONFIRM_ENV}=true to apply changes.`,
      );
    } else {
      console.log("Na Braza test data cleanup applied.");
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
