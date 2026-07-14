import {
  PrismaClient,
  type Order,
  type OrderStatus,
  type PaymentMethod,
} from "@prisma/client";
import { loadLocalEnvFile } from "./load-env";
import {
  E2E_CUSTOMER_PREFIX,
  getStoreSlug,
  uniqueCustomerName,
} from "./test-data";

loadLocalEnvFile();

const globalForPrisma = globalThis as unknown as {
  e2ePrisma?: PrismaClient;
};

function getPrisma(): PrismaClient {
  if (!globalForPrisma.e2ePrisma) {
    globalForPrisma.e2ePrisma = new PrismaClient();
  }
  return globalForPrisma.e2ePrisma;
}

export { getPrisma };

function assertCleanupAllowed(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("E2E DB cleanup is blocked when NODE_ENV=production");
  }

  if (process.env.E2E_ALLOW_DB_CLEANUP !== "true") {
    throw new Error(
      "Set E2E_ALLOW_DB_CLEANUP=true to enable cleanup of E2E orders only",
    );
  }
}

export async function cleanupE2eOrders(): Promise<number> {
  assertCleanupAllowed();
  const prisma = getPrisma();
  const result = await prisma.order.deleteMany({
    where: {
      customerName: {
        startsWith: E2E_CUSTOMER_PREFIX,
      },
    },
  });
  return result.count;
}

export async function findLatestOrderByCustomerName(
  customerName: string,
): Promise<Order | null> {
  const prisma = getPrisma();
  return prisma.order.findFirst({
    where: { customerName },
    orderBy: { createdAt: "desc" },
  });
}

export async function createE2ePickupOrder(options?: {
  customerName?: string;
  status?: OrderStatus;
  storeSlug?: string;
}): Promise<Order> {
  const prisma = getPrisma();
  const storeSlug = options?.storeSlug ?? getStoreSlug();
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
  });

  if (!store) {
    throw new Error(
      `Store "${storeSlug}" not found. Run pnpm prisma db seed before E2E.`,
    );
  }

  let product = await prisma.product.findFirst({
    where: { storeId: store.id, active: true },
    orderBy: { sortOrder: "asc" },
  });

  if (!product) {
    product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: await ensureE2eCategoryId(store.id),
        name: "E2E Product",
        description: "Produto técnico E2E",
        priceCents: 1500,
        active: true,
        sortOrder: 1,
      },
    });
  }

  const customerName =
    options?.customerName ?? uniqueCustomerName("Admin Status Customer");
  const quantity = 1;
  const unitPriceCents = product.priceCents;
  const subtotalCents = unitPriceCents * quantity;
  const code = `E2E${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
  const paymentMethod: PaymentMethod = "PIX";
  const whatsappMessage = [
    `🔥 Novo pedido — ${store.name}`,
    "",
    `Pedido: #${code}`,
    "",
    `Cliente: ${customerName}`,
    "Telefone: (13) 98888-7777",
    "",
    "Tipo: Retirada",
    "",
    "Itens:",
    `${quantity}x ${product.name} — R$ ${(subtotalCents / 100).toFixed(2).replace(".", ",")}`,
    "",
    `Total: R$ ${(subtotalCents / 100).toFixed(2).replace(".", ",")}`,
    "",
    "Pagamento: Pix",
  ].join("\n");

  return prisma.order.create({
    data: {
      storeId: store.id,
      code,
      customerName,
      customerPhone: "13988887777",
      deliveryType: "PICKUP",
      paymentMethod,
      subtotalCents,
      deliveryFeeCents: 0,
      totalCents: subtotalCents,
      status: options?.status ?? "PENDING",
      source: "DIRECT",
      whatsappMessage,
      items: {
        create: [
          {
            productId: product.id,
            productNameSnapshot: product.name,
            productDescriptionSnapshot: product.description,
            quantity,
            unitPriceCents,
            totalCents: subtotalCents,
          },
        ],
      },
    },
  });
}

async function ensureE2eCategoryId(storeId: string): Promise<string> {
  const prisma = getPrisma();
  const existing = await prisma.category.findFirst({
    where: { storeId, name: "E2E Category" },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }
  const created = await prisma.category.create({
    data: {
      storeId,
      name: "E2E Category",
      description: "Categoria técnica E2E",
      sortOrder: 1,
      active: true,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Creates (or reuses) an E2E-only store identified by slug prefix `e2e-`.
 */
export async function ensureE2eStore(options?: {
  slug?: string;
  name?: string;
}): Promise<{ id: string; slug: string; name: string }> {
  const prisma = getPrisma();
  const slug = options?.slug ?? "e2e-outra-loja";
  if (!slug.startsWith("e2e-")) {
    throw new Error('E2E store slug must start with "e2e-"');
  }

  const name = options?.name ?? "E2E Outra Loja";
  const existing = await prisma.store.findUnique({ where: { slug } });
  if (existing) {
    return { id: existing.id, slug: existing.slug, name: existing.name };
  }

  const created = await prisma.store.create({
    data: {
      name,
      slug,
      description: "Loja técnica E2E",
      whatsapp: "5513999990000",
      isOpen: true,
      pickupEnabled: true,
      deliveryEnabled: false,
      deliveryFeeCents: 0,
      minimumOrderAmountCents: 0,
    },
    select: { id: true, slug: true, name: true },
  });
  return created;
}

export async function cleanupE2eStores(): Promise<number> {
  assertCleanupAllowed();
  const prisma = getPrisma();
  // Orders for e2e stores with E2E prefix already cleaned by cleanupE2eOrders.
  // Remove leftover catalog then stores with e2e- slug only.
  const stores = await prisma.store.findMany({
    where: { slug: { startsWith: "e2e-" } },
    select: { id: true },
  });
  if (stores.length === 0) {
    return 0;
  }
  const storeIds = stores.map((s) => s.id);
  await prisma.order.deleteMany({
    where: {
      storeId: { in: storeIds },
      customerName: { startsWith: E2E_CUSTOMER_PREFIX },
    },
  });
  await prisma.productAddon.deleteMany({
    where: { product: { storeId: { in: storeIds } } },
  });
  await prisma.product.deleteMany({ where: { storeId: { in: storeIds } } });
  await prisma.addon.deleteMany({ where: { storeId: { in: storeIds } } });
  await prisma.category.deleteMany({ where: { storeId: { in: storeIds } } });
  await prisma.user.deleteMany({
    where: {
      storeId: { in: storeIds },
      email: { endsWith: "@example.com" },
    },
  });
  const result = await prisma.store.deleteMany({
    where: { id: { in: storeIds } },
  });
  return result.count;
}

/**
 * Deletes E2E store users created via master UI / fixtures.
 * Only @example.com emails with known E2E prefixes. Never touches MASTER.
 */
export async function cleanupE2eStoreUsers(): Promise<number> {
  assertCleanupAllowed();
  const prisma = getPrisma();
  const result = await prisma.user.deleteMany({
    where: {
      AND: [
        { email: { endsWith: "@example.com" } },
        {
          OR: [
            { email: { startsWith: "e2e-master-created-" } },
            { email: { startsWith: "e2e-store-" } },
            { email: { startsWith: "e2e-store-users-" } },
          ],
        },
        { role: { not: "MASTER" } },
      ],
    },
  });
  return result.count;
}

export async function getOrderStatus(orderId: string): Promise<OrderStatus> {
  const prisma = getPrisma();
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { status: true },
  });
  return order.status;
}

export async function disconnectE2ePrisma(): Promise<void> {
  if (globalForPrisma.e2ePrisma) {
    await globalForPrisma.e2ePrisma.$disconnect();
    globalForPrisma.e2ePrisma = undefined;
  }
}
