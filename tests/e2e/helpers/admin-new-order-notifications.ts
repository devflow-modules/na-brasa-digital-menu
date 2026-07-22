import { expect, type Page } from "@playwright/test";
import { formatMoney } from "../../../src/features/menu/format-money";
import {
  createE2eMenuCategory,
  createE2eMenuProduct,
  ensureE2eStore,
  getPrisma,
} from "./db";
import { ensureE2eStoreUser } from "./e2e-admin-user";

export const NOTIFICATION_POLL_TIMEOUT_MS = 20_000;

/** Exact Store ids created by this suite — never broad `e2e-*` cleanup. */
const trackedNotifyStoreIds = new Set<string>();

function assertNotifyCleanupAllowed(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Notify E2E cleanup is blocked when NODE_ENV=production");
  }
  if (process.env.E2E_ALLOW_DB_CLEANUP !== "true") {
    throw new Error(
      "Set E2E_ALLOW_DB_CLEANUP=true to enable notify-fixture cleanup",
    );
  }
}

export function trackNotifyStoreId(storeId: string): void {
  trackedNotifyStoreIds.add(storeId);
}

/**
 * Deletes only Stores (and their catalog/users/orders) tracked by this suite.
 * Safe with other E2E suites that also use `e2e-*` slugs.
 */
export async function cleanupTrackedNotifyFixtures(): Promise<void> {
  assertNotifyCleanupAllowed();
  const storeIds = [...trackedNotifyStoreIds];
  trackedNotifyStoreIds.clear();
  if (storeIds.length === 0) {
    return;
  }

  const prisma = getPrisma();
  // FunnelEvent.storeId is Restrict — clear telemetry before Store delete.
  await prisma.funnelEvent.deleteMany({
    where: { storeId: { in: storeIds } },
  });
  await prisma.order.deleteMany({ where: { storeId: { in: storeIds } } });
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
  await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
}

export async function readPendingBadgeCount(page: Page): Promise<number> {
  const badge = page.getByTestId("admin-pending-count-badge");
  if ((await badge.count()) === 0) {
    return 0;
  }
  const label = await badge.getAttribute("aria-label");
  // "Abrir fila com 3 pedidos pendentes..." or "...mais de 99..."
  const match = label?.match(/(\d+)/);
  return Number(match?.[1] ?? "0");
}

export async function readSoundPlayCount(page: Page): Promise<number> {
  const el = page.getByTestId("admin-new-order-sound-play-count");
  await expect(el).toBeAttached();
  const raw = await el.getAttribute("data-sound-play-count");
  return Number(raw ?? "0");
}

export async function expectNoNotificationChrome(page: Page): Promise<void> {
  await expect(page.getByTestId("admin-chrome")).toHaveCount(0);
  await expect(page.getByTestId("admin-pending-count-badge")).toHaveCount(0);
  await expect(page.getByTestId("admin-new-order-sound-toggle")).toHaveCount(0);
}

export async function waitForNotificationChrome(page: Page): Promise<void> {
  await expect(page.getByTestId("admin-chrome")).toBeVisible({
    timeout: NOTIFICATION_POLL_TIMEOUT_MS,
  });
  await expect(page.getByTestId("admin-new-order-sound-toggle")).toBeVisible({
    timeout: NOTIFICATION_POLL_TIMEOUT_MS,
  });
}

export async function enableNotificationSound(page: Page): Promise<number> {
  const toggle = page.getByTestId("admin-new-order-sound-toggle");
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-checked")) !== "true") {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect
    .poll(
      async () =>
        page.evaluate(() => window.localStorage.getItem("admin.newOrderSound")),
      { timeout: 5_000 },
    )
    .toBe("on");
  await expect
    .poll(async () => readSoundPlayCount(page), { timeout: 5_000 })
    .toBeGreaterThanOrEqual(1);
  return readSoundPlayCount(page);
}

export function bannerForCustomer(page: Page, customerName: string) {
  return page
    .getByTestId("admin-new-order-banner")
    .filter({ hasText: customerName });
}

export function formatOrderMoney(totalCents: number): string {
  return formatMoney(totalCents);
}

export type NotifyFixture = {
  suffix: string;
  store: { id: string; slug: string; name: string };
  operator: Awaited<ReturnType<typeof ensureE2eStoreUser>>;
  product: { id: string; name: string; priceCents: number };
};

/**
 * Isolated store + OPERATOR + one sellable product for notification E2E.
 */
export async function createNotifyFixture(
  label: string,
): Promise<NotifyFixture> {
  const suffix = `${label}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const store = await ensureE2eStore({
    slug: `e2e-notify-${suffix}`.slice(0, 48),
    name: `E2E Notify ${suffix}`,
  });
  const category = await createE2eMenuCategory({
    storeSlug: store.slug,
    name: `E2E Notify Cat ${suffix}`,
  });
  const product = await createE2eMenuProduct({
    categoryId: category.id,
    storeId: store.id,
    name: `E2E Notify Product ${suffix}`,
    priceCents: 2500,
  });
  const operator = await ensureE2eStoreUser({
    role: "OPERATOR",
    storeSlug: store.slug,
    email: `e2e-store-notify-${suffix}@example.com`,
    password: `notify-${suffix}-password`,
    name: `E2E Notify Operator ${suffix}`,
  });

  trackNotifyStoreId(store.id);
  return { suffix, store, operator, product };
}
