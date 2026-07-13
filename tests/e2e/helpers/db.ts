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
}): Promise<Order> {
  const prisma = getPrisma();
  const storeSlug = getStoreSlug();
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
  });

  if (!store) {
    throw new Error(
      `Store "${storeSlug}" not found. Run pnpm prisma db seed before E2E.`,
    );
  }

  const product = await prisma.product.findFirst({
    where: { storeId: store.id, active: true },
    orderBy: { sortOrder: "asc" },
  });

  if (!product) {
    throw new Error("No active product found for E2E order helper");
  }

  const customerName =
    options?.customerName ?? uniqueCustomerName("Admin Status Customer");
  const quantity = 1;
  const unitPriceCents = product.priceCents;
  const subtotalCents = unitPriceCents * quantity;
  const code = `E2E${Date.now().toString().slice(-8)}`;
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
