import type {
  DeliveryType,
  Order,
  OrderSource,
  OrderStatus,
  PaymentMethod,
} from "@prisma/client";
import { zonedWallTimeToUtc } from "@/features/admin/reports/daily-closing-period";
import {
  cleanupE2eOrders,
  cleanupE2eStores,
  disconnectE2ePrisma,
  ensureE2eStore,
  getPrisma,
} from "./db";
import { E2E_CUSTOMER_PREFIX, uniqueCustomerName } from "./test-data";

export const DAILY_CLOSING_E2E_DATE = "2026-07-21";
export const DAILY_CLOSING_E2E_START = "17:00";
export const DAILY_CLOSING_E2E_END = "01:00";

export type DailyClosingE2eAddonInput = {
  addonId?: string | null;
  addonNameSnapshot: string;
  addonPriceCents: number;
};

export type DailyClosingE2eItemInput = {
  productId?: string | null;
  productNameSnapshot: string;
  productDescriptionSnapshot?: string | null;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  notes?: string | null;
  addons?: DailyClosingE2eAddonInput[];
};

export type CreateDailyClosingE2eOrderInput = {
  storeId: string;
  createdAt: Date;
  status: OrderStatus;
  source: OrderSource;
  deliveryType: DeliveryType;
  paymentMethod: PaymentMethod | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  customerName: string;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  notes?: string | null;
  items: DailyClosingE2eItemInput[];
};

export type DailyClosingE2eOrderResult = {
  order: Order;
  code: string;
  expected: {
    subtotalCents: number;
    deliveryFeeCents: number;
    totalCents: number;
    status: OrderStatus;
    source: OrderSource;
    deliveryType: DeliveryType;
    paymentMethod: PaymentMethod | null;
    itemQuantities: number;
    productNames: string[];
  };
};

/**
 * Convert a wall-clock instant in America/Sao_Paulo to UTC.
 * Accepts `HH:mm`, `HH:mm:ss`, or `HH:mm:ss.sss`.
 */
export function dailyClosingWallTimeToUtc(
  date: string,
  time: string,
): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!dateMatch) {
    throw new Error(`Invalid date "${date}"`);
  }

  const timeMatch =
    /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(time);
  if (!timeMatch) {
    throw new Error(`Invalid time "${time}"`);
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? "0");
  const millisecond = Number((timeMatch[4] ?? "0").padEnd(3, "0").slice(0, 3));

  const base = zonedWallTimeToUtc(year, month, day, hour, minute);
  return new Date(base.getTime() + second * 1000 + millisecond);
}

function assertE2eCustomerName(customerName: string): void {
  if (!customerName.startsWith(E2E_CUSTOMER_PREFIX)) {
    throw new Error(
      `Daily closing E2E customerName must start with "${E2E_CUSTOMER_PREFIX}"`,
    );
  }
}

function uniqueOrderCode(): string {
  return `DCE2E${Date.now().toString(36)}${Math.floor(Math.random() * 90 + 10)}`;
}

/**
 * Creates an order with fully explicit financial and operational fields.
 * Snapshots are persisted as provided — catalog prices are not consulted.
 */
export async function createDailyClosingE2eOrder(
  input: CreateDailyClosingE2eOrderInput,
): Promise<DailyClosingE2eOrderResult> {
  assertE2eCustomerName(input.customerName);

  if (input.items.length === 0) {
    throw new Error("createDailyClosingE2eOrder requires at least one item");
  }

  const prisma = getPrisma();
  const code = uniqueOrderCode();

  const order = await prisma.order.create({
    data: {
      storeId: input.storeId,
      code,
      customerName: input.customerName,
      customerPhone: input.customerPhone ?? null,
      deliveryType: input.deliveryType,
      deliveryAddress: input.deliveryAddress ?? null,
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? null,
      subtotalCents: input.subtotalCents,
      deliveryFeeCents: input.deliveryFeeCents,
      totalCents: input.totalCents,
      status: input.status,
      source: input.source,
      createdAt: input.createdAt,
      items: {
        create: input.items.map((item) => ({
          productId: item.productId ?? null,
          productNameSnapshot: item.productNameSnapshot,
          productDescriptionSnapshot: item.productDescriptionSnapshot ?? null,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalCents: item.totalCents,
          notes: item.notes ?? null,
          addons: {
            create: (item.addons ?? []).map((addon) => ({
              addonId: addon.addonId ?? null,
              addonNameSnapshot: addon.addonNameSnapshot,
              addonPriceCents: addon.addonPriceCents,
            })),
          },
        })),
      },
    },
  });

  return {
    order,
    code,
    expected: {
      subtotalCents: input.subtotalCents,
      deliveryFeeCents: input.deliveryFeeCents,
      totalCents: input.totalCents,
      status: input.status,
      source: input.source,
      deliveryType: input.deliveryType,
      paymentMethod: input.paymentMethod,
      itemQuantities: input.items.reduce((sum, item) => sum + item.quantity, 0),
      productNames: input.items.map((item) => item.productNameSnapshot),
    },
  };
}

export async function setDailyClosingOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  await getPrisma().order.update({
    where: { id: orderId },
    data: { status },
  });
}

export async function setDailyClosingOrderCreatedAt(
  orderId: string,
  createdAt: Date,
): Promise<void> {
  await getPrisma().order.update({
    where: { id: orderId },
    data: { createdAt },
  });
}

export async function createDailyClosingE2eStore(options: {
  slug: string;
  name: string;
}): Promise<{ id: string; slug: string; name: string }> {
  return ensureE2eStore({
    slug: options.slug.startsWith("e2e-")
      ? options.slug
      : `e2e-${options.slug}`,
    name: options.name,
  });
}

export async function resolveOfficialStoreId(): Promise<string> {
  const prisma = getPrisma();
  const slug = process.env.NEXT_PUBLIC_STORE_SLUG?.trim() || "na-brasa";
  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!store) {
    throw new Error(`Store "${slug}" not found for daily closing E2E`);
  }
  return store.id;
}

export async function renameProductForSnapshotTest(options: {
  productId: string;
  newName: string;
}): Promise<void> {
  await getPrisma().product.update({
    where: { id: options.productId },
    data: { name: options.newName },
  });
}

export async function ensureSnapshotProduct(options: {
  storeId: string;
  name: string;
}): Promise<{ id: string; name: string }> {
  const prisma = getPrisma();
  let category = await prisma.category.findFirst({
    where: { storeId: options.storeId, name: "E2E Daily Closing Category" },
    select: { id: true },
  });
  if (!category) {
    category = await prisma.category.create({
      data: {
        storeId: options.storeId,
        name: "E2E Daily Closing Category",
        sortOrder: 99,
        active: true,
      },
      select: { id: true },
    });
  }

  const product = await prisma.product.create({
    data: {
      storeId: options.storeId,
      categoryId: category.id,
      name: options.name,
      description: "Produto técnico snapshot E2E",
      priceCents: 2500,
      active: true,
      available: true,
      sortOrder: 99,
    },
    select: { id: true, name: true },
  });

  return product;
}

export function uniqueDailyClosingCustomer(label: string): string {
  return uniqueCustomerName(`DailyClosing ${label}`);
}

export async function cleanupDailyClosingE2eData(): Promise<void> {
  await cleanupE2eOrders();
  await cleanupE2eStores();
  await disconnectE2ePrisma();
}

export function dailyClosingReportUrl(options?: {
  date?: string;
  start?: string;
  end?: string;
}): string {
  const params = new URLSearchParams({
    date: options?.date ?? DAILY_CLOSING_E2E_DATE,
    start: options?.start ?? DAILY_CLOSING_E2E_START,
    end: options?.end ?? DAILY_CLOSING_E2E_END,
  });
  return `/admin/relatorios/fechamento?${params.toString()}`;
}
