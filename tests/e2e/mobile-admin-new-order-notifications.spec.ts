import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import {
  bannerForCustomer,
  cleanupTrackedNotifyFixtures,
  createNotifyFixture,
  NOTIFICATION_POLL_TIMEOUT_MS,
  waitForNotificationChrome,
} from "./helpers/admin-new-order-notifications";
import { createE2ePickupOrder, disconnectE2ePrisma } from "./helpers/db";
import { uniqueCustomerName } from "./helpers/test-data";

test.describe("mobile admin new-order notifications", () => {
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

  test("Pixel viewport can use banner, badge chrome and detail link", async ({
    page,
  }) => {
    const fixture = await createNotifyFixture("mobile");
    await loginAsUser(page, fixture.operator);
    await waitForNotificationChrome(page);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    await expect(page.getByTestId("admin-new-order-sound-toggle")).toBeVisible();

    const customer = uniqueCustomerName("Notify Mobile");
    const order = await createE2ePickupOrder({
      customerName: customer,
      storeSlug: fixture.store.slug,
    });

    const banner = bannerForCustomer(page, customer);
    await expect(banner).toBeVisible({ timeout: NOTIFICATION_POLL_TIMEOUT_MS });
    await expect(banner.getByRole("link", { name: "Abrir pedido" })).toBeVisible();
    await expect(
      banner.getByRole("button", { name: "Dispensar" }),
    ).toBeVisible();

    const bannerBox = await banner.boundingBox();
    expect(bannerBox).not.toBeNull();
    if (bannerBox) {
      expect(bannerBox.x).toBeGreaterThanOrEqual(0);
      expect(bannerBox.width).toBeLessThanOrEqual(clientWidth + 1);
    }

    await banner.getByRole("link", { name: "Abrir pedido" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/pedidos/${order.id}`));
    await expect(page.getByTestId("admin-order-detail")).toBeVisible();

    await page.goto("/admin");
    await waitForNotificationChrome(page);

    const secondCustomer = uniqueCustomerName("Notify Mobile Dismiss");
    await createE2ePickupOrder({
      customerName: secondCustomer,
      storeSlug: fixture.store.slug,
    });
    const secondBanner = bannerForCustomer(page, secondCustomer);
    await expect(secondBanner).toBeVisible({
      timeout: NOTIFICATION_POLL_TIMEOUT_MS,
    });
    await secondBanner.getByRole("button", { name: "Dispensar" }).click();
    await expect(secondBanner).toHaveCount(0);
  });
});
