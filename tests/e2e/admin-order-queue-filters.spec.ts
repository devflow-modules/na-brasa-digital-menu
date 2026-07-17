import { expect, test, type Page } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import {
  cleanupE2eOrders,
  createE2eCounterOrder,
  createE2ePickupOrder,
  disconnectE2ePrisma,
} from "./helpers/db";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import { uniqueCustomerName } from "./helpers/test-data";

async function clearQueueFilters(page: Page): Promise<void> {
  await page.getByTestId("admin-orders-filter-clear").click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByTestId("admin-orders-filter-clear")).toHaveCount(0);
  await expect(page.getByTestId("admin-orders-filter-status")).toHaveValue("");
  await expect(page.getByTestId("admin-orders-filter-source")).toHaveValue("");
  await expect(page.getByTestId("admin-orders-filter-q")).toHaveValue("");
}

test.describe("admin order queue filters", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eOrders();
    await disconnectE2ePrisma();
  });

  test("filters by source, code, name, status combo and clears", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-orders-filters-manager@example.com",
    });
    const directCustomer = uniqueCustomerName("Filter Direct Customer");
    const counterCustomer = uniqueCustomerName("Filter Counter Customer");

    const directOrder = await createE2ePickupOrder({
      customerName: directCustomer,
      status: "PENDING",
    });
    const counterOrder = await createE2eCounterOrder({
      customerName: counterCustomer,
      status: "PENDING",
    });

    await loginAsUser(page, manager);
    await expect(page.getByTestId("admin-orders-filters")).toBeVisible();
    await expect(page.getByTestId("admin-orders-list")).toBeVisible();

    const directRow = page.locator(
      `[data-testid="admin-order-row"][data-order-id="${directOrder.id}"]`,
    );
    const counterRow = page.locator(
      `[data-testid="admin-order-row"][data-order-id="${counterOrder.id}"]`,
    );
    await expect(directRow).toBeVisible();
    await expect(counterRow).toBeVisible();

    await page.getByTestId("admin-orders-filter-source").selectOption("COUNTER");
    await page.getByTestId("admin-orders-filter-apply").click();
    await expect(page).toHaveURL(/source=COUNTER/);
    await expect(counterRow).toBeVisible();
    await expect(directRow).toHaveCount(0);

    await clearQueueFilters(page);
    await expect(directRow).toBeVisible();
    await expect(counterRow).toBeVisible();

    await page.getByTestId("admin-orders-filter-q").fill(directOrder.code);
    await page.getByTestId("admin-orders-filter-apply").click();
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(directOrder.code)}|q=${directOrder.code}`));
    await expect(directRow).toBeVisible();
    await expect(counterRow).toHaveCount(0);

    await clearQueueFilters(page);
    await page.getByTestId("admin-orders-filter-q").fill(counterCustomer);
    await page.getByTestId("admin-orders-filter-apply").click();
    await expect(counterRow).toBeVisible();
    await expect(directRow).toHaveCount(0);

    await clearQueueFilters(page);
    await page.getByTestId("admin-orders-filter-status").selectOption("PENDING");
    await page.getByTestId("admin-orders-filter-source").selectOption("DIRECT");
    await page.getByTestId("admin-orders-filter-apply").click();
    await expect(page).toHaveURL(/status=PENDING/);
    await expect(page).toHaveURL(/source=DIRECT/);
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(directRow).toBeVisible();
    await expect(counterRow).toHaveCount(0);

    await clearQueueFilters(page);
    await expect(directRow).toBeVisible();
    await expect(counterRow).toBeVisible();
  });

  test("mobile viewport can apply and clear source filter", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 851 });

    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-orders-filters-mobile@example.com",
    });
    const directCustomer = uniqueCustomerName("Filter Mobile Direct");
    const counterCustomer = uniqueCustomerName("Filter Mobile Counter");
    const directOrder = await createE2ePickupOrder({
      customerName: directCustomer,
    });
    const counterOrder = await createE2eCounterOrder({
      customerName: counterCustomer,
    });

    await loginAsUser(page, manager);
    await expect(page.getByTestId("admin-orders-filters")).toBeVisible();

    const directCard = page.locator(
      `[data-testid="admin-order-card"][data-order-id="${directOrder.id}"]`,
    );
    const counterCard = page.locator(
      `[data-testid="admin-order-card"][data-order-id="${counterOrder.id}"]`,
    );

    await page.getByTestId("admin-orders-filter-source").selectOption("COUNTER");
    await page.getByTestId("admin-orders-filter-apply").click();
    await expect(counterCard).toBeVisible();
    await expect(directCard).toHaveCount(0);

    await clearQueueFilters(page);
    await expect(directCard).toBeVisible();
    await expect(counterCard).toBeVisible();
  });
});
