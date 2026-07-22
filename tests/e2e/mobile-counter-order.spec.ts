import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import { seedCounterOrderE2eCatalog } from "./helpers/counter-order-catalog";
import {
  cleanupE2eAddons,
  cleanupE2eMenuCatalog,
  cleanupE2eOrders,
  disconnectE2ePrisma,
  findLatestOrderByCustomerName,
  getOrderPaymentSnapshot,
} from "./helpers/db";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import { uniqueCustomerName } from "./helpers/test-data";

test.describe("mobile counter order", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eOrders();
    await cleanupE2eAddons();
    await cleanupE2eMenuCatalog();
    await disconnectE2ePrisma();
  });

  test("Pixel viewport can create COUNTER and open receive dialog", async ({
    page,
  }) => {
    const catalog = await seedCounterOrderE2eCatalog({
      suffix: `mobile-${Date.now()}`,
    });
    const customerLabel = uniqueCustomerName("Balcao Mobile");
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-counter-operator-mobile@example.com",
    });

    await loginAsUser(page, operator);
    await page.goto("/admin/balcao");
    await expect(page.getByTestId("admin-counter-order-page")).toBeVisible();

    const bodyBox = await page.locator("body").boundingBox();
    expect(bodyBox).not.toBeNull();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    await expect(page.getByTestId("counter-order-category-all")).toBeVisible();
    await page
      .getByTestId(`counter-order-category-${catalog.categoryId}`)
      .click();

    await page
      .getByTestId(`counter-order-product-${catalog.plainProduct.id}`)
      .click();
    await expect(page.getByTestId("counter-order-open-review")).toBeEnabled();
    await expect(page.getByTestId("counter-order-draft-total")).toBeVisible();

    await page.getByTestId("counter-order-open-review").click();
    await expect(page.getByTestId("counter-order-review")).toBeVisible();
    await page.getByTestId("counter-order-customer-label").fill(customerLabel);
    await page.getByTestId("counter-order-submit").click();

    await expect(page.getByTestId("counter-order-success")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/admin\/balcao/);
    await expect(page.getByTestId("counter-order-new-order")).toBeVisible();
    await expect(page.getByTestId("counter-order-view-order")).toBeVisible();
    await expect(page.getByTestId("counter-order-go-to-orders")).toBeVisible();

    const created = await findLatestOrderByCustomerName(customerLabel);
    expect(created).not.toBeNull();
    if (!created) {
      return;
    }

    await page.goto(`/admin/pedidos/${created.id}`);
    await page.getByTestId("order-status-action-CONFIRMED").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "CONFIRMED",
      { timeout: 15_000 },
    );
    await page.getByTestId("order-status-action-PREPARING").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "PREPARING",
      { timeout: 15_000 },
    );
    await page.getByTestId("order-status-action-READY").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "READY",
      { timeout: 15_000 },
    );

    await page.getByTestId("counter-order-receive-cta").click();
    await expect(page.getByTestId("receive-and-finalize-dialog")).toBeVisible();
    await page.getByTestId("receive-payment-PIX").click();
    await page.getByTestId("receive-finalize-confirm").click();

    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "COMPLETED",
      { timeout: 15_000 },
    );

    const paid = await getOrderPaymentSnapshot(created.id);
    expect(paid.paymentMethod).toBe("PIX");
    expect(paid.paidAt).not.toBeNull();
    expect(paid.payments).toEqual([
      {
        method: "PIX",
        amountCents: paid.totalCents,
        tenderedCents: null,
        changeCents: null,
      },
    ]);
  });
});
