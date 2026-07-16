import {
  PrismaClient,
  type Order,
  type OrderStatus,
  type PaymentMethod,
} from "@prisma/client";
import { applyNaBrazaPilotMenu } from "../../../prisma/na-braza-pilot-menu";
import { loadLocalEnvFile } from "./load-env";
import {
  E2E_CUSTOMER_PREFIX,
  getStoreSlug,
  OFFICIAL_STORE_DISPLAY_NAME,
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

/** Aligns E2E DB display name with official brand (does not run in production). */
export async function ensureOfficialStoreDisplayNameForE2e(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  const prisma = getPrisma();
  const storeSlug = getStoreSlug();
  await prisma.store.updateMany({
    where: { slug: storeSlug },
    data: { name: OFFICIAL_STORE_DISPLAY_NAME },
  });
}

/**
 * Reads the official store minimum order (cents).
 * Returns null when the store is missing. Schema field is Int (non-null); 0 means no minimum.
 */
export async function getOfficialStoreMinimumOrderAmountCentsForE2e(): Promise<
  number | null
> {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  const prisma = getPrisma();
  const storeSlug = getStoreSlug();
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
    select: { minimumOrderAmountCents: true },
  });
  return store?.minimumOrderAmountCents ?? null;
}

/**
 * Sets store minimum order for E2E scenarios (does not run in production).
 * Schema field is Int (non-null); pass 0 for “no minimum”.
 */
export async function setOfficialStoreMinimumOrderAmountCentsForE2e(
  minimumOrderAmountCents: number,
): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  const prisma = getPrisma();
  const storeSlug = getStoreSlug();
  await prisma.store.updateMany({
    where: { slug: storeSlug },
    data: { minimumOrderAmountCents },
  });
}

/** Reads official store public description (null when store missing). */
export async function getOfficialStoreDescriptionForE2e(): Promise<
  string | null
> {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  const prisma = getPrisma();
  const storeSlug = getStoreSlug();
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
    select: { description: true },
  });
  return store ? store.description : null;
}

/** Sets official store description for E2E (does not run in production). */
export async function setOfficialStoreDescriptionForE2e(
  description: string | null,
): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  const prisma = getPrisma();
  const storeSlug = getStoreSlug();
  await prisma.store.updateMany({
    where: { slug: storeSlug },
    data: { description },
  });
}

/** Reads official store open flag (null when store missing). */
export async function getOfficialStoreIsOpenForE2e(): Promise<boolean | null> {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  const prisma = getPrisma();
  const storeSlug = getStoreSlug();
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
    select: { isOpen: true },
  });
  return store?.isOpen ?? null;
}

/** Sets official store open flag for E2E (does not run in production). */
export async function setOfficialStoreIsOpenForE2e(
  isOpen: boolean,
): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  const prisma = getPrisma();
  const storeSlug = getStoreSlug();
  await prisma.store.updateMany({
    where: { slug: storeSlug },
    data: { isOpen },
  });
}

/** Applies pilot catalog to the E2E store (does not run in production). */
export async function ensurePilotMenuForE2e(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  const prisma = getPrisma();
  const storeSlug = getStoreSlug();
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
    select: { id: true },
  });
  if (!store) {
    throw new Error(`Store "${storeSlug}" not found for E2E pilot menu apply.`);
  }
  await applyNaBrazaPilotMenu(prisma, store.id);
}

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
        available: true,
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

export type E2eOrderPaymentSnapshot = {
  id: string;
  storeId: string;
  code: string;
  source: Order["source"];
  status: OrderStatus;
  paymentMethod: PaymentMethod | null;
  changeForCents: number | null;
  paidAt: Date | null;
  totalCents: number;
  createdByUserId: string | null;
  customerName: string;
};

export async function getOrderPaymentSnapshot(
  orderId: string,
): Promise<E2eOrderPaymentSnapshot> {
  const prisma = getPrisma();
  return prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      storeId: true,
      code: true,
      source: true,
      status: true,
      paymentMethod: true,
      changeForCents: true,
      paidAt: true,
      totalCents: true,
      createdByUserId: true,
      customerName: true,
    },
  });
}

/**
 * Seeds a COUNTER order for focused finalization / authz E2E cases.
 * customerName must use the E2E prefix for cleanup.
 */
export async function createE2eCounterOrder(options?: {
  customerName?: string;
  status?: OrderStatus;
  storeSlug?: string;
  createdByUserId?: string | null;
  paymentMethod?: PaymentMethod | null;
  paidAt?: Date | null;
  changeForCents?: number | null;
  totalCents?: number;
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
    where: { storeId: store.id, active: true, available: true },
    orderBy: { sortOrder: "asc" },
  });

  if (!product) {
    product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: await ensureE2eCategoryId(store.id),
        name: "E2E Counter Product",
        description: "Produto técnico E2E balcão",
        priceCents: 2000,
        active: true,
        available: true,
        sortOrder: 1,
      },
    });
  }

  const customerName =
    options?.customerName ?? uniqueCustomerName("Counter Order");
  const quantity = 1;
  const unitPriceCents = options?.totalCents ?? product.priceCents;
  const subtotalCents = unitPriceCents * quantity;
  const code = `E2C${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;

  return prisma.order.create({
    data: {
      storeId: store.id,
      code,
      customerName,
      customerPhone: null,
      deliveryType: "PICKUP",
      paymentMethod: options?.paymentMethod ?? null,
      changeForCents: options?.changeForCents ?? null,
      paidAt: options?.paidAt ?? null,
      subtotalCents,
      deliveryFeeCents: 0,
      totalCents: subtotalCents,
      status: options?.status ?? "PENDING",
      source: "COUNTER",
      whatsappMessage: null,
      createdByUserId: options?.createdByUserId ?? null,
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

export async function disconnectE2ePrisma(): Promise<void> {
  if (globalForPrisma.e2ePrisma) {
    await globalForPrisma.e2ePrisma.$disconnect();
    globalForPrisma.e2ePrisma = undefined;
  }
}

export const E2E_MENU_PREFIX = "E2E Menu";

export async function createE2eMenuCategory(options?: {
  storeSlug?: string;
  name?: string;
  sortOrder?: number;
}): Promise<{ id: string; name: string; storeId: string }> {
  const prisma = getPrisma();
  const storeSlug = options?.storeSlug ?? getStoreSlug();
  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) {
    throw new Error(`Store "${storeSlug}" not found`);
  }
  const name = options?.name ?? `${E2E_MENU_PREFIX} Category ${Date.now()}`;
  const category = await prisma.category.create({
    data: {
      storeId: store.id,
      name,
      description: "Categoria técnica E2E",
      sortOrder: options?.sortOrder ?? 999,
      active: true,
    },
    select: { id: true, name: true, storeId: true },
  });
  return category;
}

export async function createE2eMenuProduct(options: {
  categoryId: string;
  storeId: string;
  name?: string;
  priceCents?: number;
  active?: boolean;
  available?: boolean;
  featured?: boolean;
  imageUrl?: string | null;
}): Promise<{
  id: string;
  name: string;
  priceCents: number;
  active: boolean;
  available: boolean;
  featured: boolean;
}> {
  const prisma = getPrisma();
  const name = options.name ?? `${E2E_MENU_PREFIX} Product ${Date.now()}`;
  const product = await prisma.product.create({
    data: {
      storeId: options.storeId,
      categoryId: options.categoryId,
      name,
      description: "Produto técnico E2E menu",
      priceCents: options.priceCents ?? 1990,
      sortOrder: 999,
      active: options.active ?? true,
      available: options.available ?? true,
      featured: options.featured ?? false,
      ...(options.imageUrl !== undefined ? { imageUrl: options.imageUrl } : {}),
    },
    select: {
      id: true,
      name: true,
      priceCents: true,
      active: true,
      available: true,
      featured: true,
    },
  });
  return product;
}

export async function setE2eProductAvailability(
  productId: string,
  available: boolean,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.product.update({
    where: { id: productId },
    data: { available },
  });
}

export async function cleanupE2eMenuCatalog(): Promise<void> {
  assertCleanupAllowed();
  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { startsWith: E2E_MENU_PREFIX } },
        { name: { startsWith: "E2E Addon Product" } },
      ],
    },
    select: { id: true },
  });
  if (products.length > 0) {
    const ids = products.map((p) => p.id);
    await prisma.productAddon.deleteMany({
      where: { productId: { in: ids } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: ids } },
    });
  }
  await prisma.category.deleteMany({
    where: { name: { startsWith: E2E_MENU_PREFIX } },
  });
}

export async function getProductById(productId: string) {
  const prisma = getPrisma();
  return prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      priceCents: true,
      active: true,
      available: true,
      storeId: true,
    },
  });
}

export const E2E_ADDON_PREFIX = "E2E Addon";

export async function createE2eAddon(options?: {
  storeId?: string;
  storeSlug?: string;
  name?: string;
  priceCents?: number;
  active?: boolean;
}): Promise<{
  id: string;
  name: string;
  priceCents: number;
  active: boolean;
  storeId: string;
}> {
  const prisma = getPrisma();
  let storeId = options?.storeId;
  if (!storeId) {
    const storeSlug = options?.storeSlug ?? getStoreSlug();
    const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
    if (!store) {
      throw new Error(`Store "${storeSlug}" not found`);
    }
    storeId = store.id;
  }
  const name = options?.name ?? `${E2E_ADDON_PREFIX} ${Date.now()}`;
  const addon = await prisma.addon.create({
    data: {
      storeId,
      name,
      description: "Adicional técnico E2E",
      priceCents: options?.priceCents ?? 350,
      sortOrder: 999,
      active: options?.active ?? true,
    },
    select: {
      id: true,
      name: true,
      priceCents: true,
      active: true,
      storeId: true,
    },
  });
  return addon;
}

export async function linkE2eAddonToProduct(
  productId: string,
  addonId: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.productAddon.upsert({
    where: { productId_addonId: { productId, addonId } },
    create: { productId, addonId },
    update: {},
  });
}

export async function unlinkE2eAddonFromProduct(
  productId: string,
  addonId: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.productAddon.deleteMany({
    where: { productId, addonId },
  });
}

export async function getAddonById(addonId: string) {
  const prisma = getPrisma();
  return prisma.addon.findUnique({
    where: { id: addonId },
    select: {
      id: true,
      name: true,
      priceCents: true,
      active: true,
      storeId: true,
    },
  });
}

export async function cleanupE2eAddons(): Promise<void> {
  assertCleanupAllowed();
  const prisma = getPrisma();
  const addons = await prisma.addon.findMany({
    where: { name: { startsWith: E2E_ADDON_PREFIX } },
    select: { id: true },
  });
  if (addons.length > 0) {
    await prisma.productAddon.deleteMany({
      where: { addonId: { in: addons.map((a) => a.id) } },
    });
    await prisma.addon.deleteMany({
      where: { id: { in: addons.map((a) => a.id) } },
    });
  }
}
