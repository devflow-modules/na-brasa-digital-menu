import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import {
  bannerForCustomer,
  cleanupTrackedNotifyFixtures,
  createNotifyFixture,
  NOTIFICATION_POLL_TIMEOUT_MS,
  waitForNotificationChrome,
} from "./helpers/admin-new-order-notifications";
import { seedCounterOrderE2eCatalog } from "./helpers/counter-order-catalog";
import {
  createE2ePickupOrder,
  disconnectE2ePrisma,
  findLatestOrderByCustomerName,
} from "./helpers/db";
import { uniqueCustomerName } from "./helpers/test-data";

const QUEUE_REFRESH_TIMEOUT_MS = NOTIFICATION_POLL_TIMEOUT_MS;

test.describe("admin orders live refresh", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterEach(async () => {
    await cleanupTrackedNotifyFixtures();
  });

  test.afterAll(async () => {
    await cleanupTrackedNotifyFixtures();
    await disconnectE2ePrisma();
  });

  test("new DIRECT order appears in the queue without manual reload", async ({
    page,
  }) => {
    const fixture = await createNotifyFixture("live-refresh-new");
    await loginAsUser(page, fixture.operator);
    await waitForNotificationChrome(page);
    await expect(page.getByTestId("admin-orders-dashboard")).toBeVisible();

    const customerName = uniqueCustomerName("Live Refresh New");
    const order = await createE2ePickupOrder({
      customerName,
      storeSlug: fixture.store.slug,
      status: "PENDING",
    });
    expect(order.source).toBe("DIRECT");

    const banner = bannerForCustomer(page, customerName);
    await expect(banner).toBeVisible({ timeout: QUEUE_REFRESH_TIMEOUT_MS });
    await expect(banner).toContainText(order.code);

    const row = page.locator(
      `[data-testid="admin-order-row"][data-order-id="${order.id}"]`,
    );
    await expect(row).toBeVisible({ timeout: QUEUE_REFRESH_TIMEOUT_MS });
    await expect(row.getByTestId("order-source-badge")).toHaveAttribute(
      "data-source",
      "DIRECT",
    );
    await expect(row.getByTestId("order-source-badge")).toHaveText("Online");
    await expect(row).toContainText(`#${order.code}`);

    // Explicitly avoid page.reload — live refresh must surface the row.
    await expect(page.getByTestId("admin-orders-refresh-status")).toBeAttached();
  });

  test("status change refreshes detail without manual reload", async ({
    page,
  }) => {
    const fixture = await createNotifyFixture("live-refresh-status");
    const customerName = uniqueCustomerName("Live Refresh Status");
    const order = await createE2ePickupOrder({
      customerName,
      storeSlug: fixture.store.slug,
      status: "PENDING",
    });

    await loginAsUser(page, fixture.operator);
    await waitForNotificationChrome(page);

    await page.goto(`/admin/pedidos/${order.id}`);
    await expect(page.getByTestId("admin-order-detail")).toBeVisible();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "PENDING",
    );

    await page.getByTestId("order-status-action-CONFIRMED").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "CONFIRMED",
      { timeout: 15_000 },
    );

    await page.getByTestId("admin-orders-nav-link").click();
    await expect(page).toHaveURL(/\/admin\/?$/);

    const row = page.locator(
      `[data-testid="admin-order-row"][data-order-id="${order.id}"]`,
    );
    await expect(row).toBeVisible();
    await expect(row.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "CONFIRMED",
    );
  });

  test("COUNTER create then Pedidos shows the order without reload", async ({
    page,
  }) => {
    const fixture = await createNotifyFixture("live-refresh-counter");
    const catalog = await seedCounterOrderE2eCatalog({
      storeSlug: fixture.store.slug,
      suffix: `live-${fixture.suffix}`,
    });
    const customerLabel = uniqueCustomerName("Live Refresh Counter");

    await loginAsUser(page, fixture.operator);
    await waitForNotificationChrome(page);

    await page.getByTestId("admin-counter-nav-link").click();
    await expect(page.getByTestId("admin-counter-order-page")).toBeVisible();

    await page
      .getByTestId(`counter-order-product-${catalog.plainProduct.id}`)
      .click();
    await page.getByTestId("counter-order-open-review").click();
    await page.getByTestId("counter-order-customer-label").fill(customerLabel);
    await page.getByTestId("counter-order-submit").click();

    await expect(page.getByTestId("counter-order-success")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/admin\/balcao/);

    await page.getByTestId("counter-order-go-to-orders").click();
    await expect(page).toHaveURL(/\/admin\/?$/);

    const created = await findLatestOrderByCustomerName(customerLabel);
    expect(created).not.toBeNull();
    expect(created?.source).toBe("COUNTER");

    const row = page.locator(
      `[data-testid="admin-order-row"][data-order-id="${created!.id}"]`,
    );
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByTestId("order-source-badge")).toHaveAttribute(
      "data-source",
      "COUNTER",
    );
    await expect(row.getByTestId("order-source-badge")).toHaveText("Balcão");
  });
});
