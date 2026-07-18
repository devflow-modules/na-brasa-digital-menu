import { expect, test } from "@playwright/test";
import {
  createE2eMenuCategory,
  createE2eMenuProduct,
  ensurePilotMenuForE2e,
  findLatestOrderByCustomerName,
  getOfficialStoreIsOpenForE2e,
  getOfficialStoreMinimumOrderAmountCentsForE2e,
  getOfficialStoreOnlineModalitiesForE2e,
  setOfficialStoreIsOpenForE2e,
  setOfficialStoreMinimumOrderAmountCentsForE2e,
  setOfficialStoreOnlineModalitiesForE2e,
} from "./helpers/db";
import { addProductToCartByName, clearCartStorage } from "./helpers/menu";
import {
  CART_STORAGE_KEY,
  e2ePhone,
  uniqueCustomerName,
} from "./helpers/test-data";
import { PILOT_BURGER_PRODUCT_NAME } from "../../prisma/na-braza-pilot-menu";

test.describe("checkout order", () => {
  test.beforeEach(async ({ page }) => {
    await ensurePilotMenuForE2e();
    await clearCartStorage(page);
  });

  test("desktop checkout keeps in-flow summary without mobile sticky bar", async ({
    page,
  }) => {
    await addProductToCartByName(page, PILOT_BURGER_PRODUCT_NAME, {
      quantity: 1,
    });
    await page.getByTestId("checkout-cta").click();
    await expect(page).toHaveURL(/\/na-brasa\/checkout/);

    await expect(page.getByTestId("checkout-order-summary")).toBeVisible();
    await expect(page.getByTestId("checkout-estimated-total")).toBeVisible();
    await expect(page.getByTestId("checkout-mobile-sticky-summary")).toBeHidden();
    await expect(page.getByTestId("checkout-submit-button")).toHaveCount(1);

    const barPosition = await page
      .getByTestId("checkout-submit-bar")
      .evaluate((el) => getComputedStyle(el).position);
    expect(barPosition).toBe("static");
  });

  test("creates order, opens wa.me, clears cart, and persists PENDING order", async ({
    page,
  }) => {
    const customerName = uniqueCustomerName("Pickup Customer");

    await addProductToCartByName(page, PILOT_BURGER_PRODUCT_NAME, {
      quantity: 2,
    });
    await page.getByTestId("checkout-cta").click();
    await expect(page).toHaveURL(/\/na-brasa\/checkout/);

    await page.getByLabel("Nome").fill(customerName);
    await page.getByLabel("WhatsApp para contato").fill(e2ePhone);
    await page.getByText("Retirada", { exact: true }).click();
    await page.getByText("Pix", { exact: true }).click();

    // Avoid flaky external WhatsApp loads while still asserting the redirect URL.
    await page.route(/wa\.me|api\.whatsapp\.com/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>whatsapp-stub</title><body>ok</body>",
      });
    });

    await Promise.all([
      page.waitForURL(/wa\.me|api\.whatsapp\.com/, {
        timeout: 45_000,
        waitUntil: "commit",
      }),
      page.getByTestId("checkout-submit-button").click(),
    ]);

    expect(page.url()).toMatch(/wa\.me|api\.whatsapp\.com/);

    await page.goto("/na-brasa");
    const cartItemCount = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return 0;
      }
      try {
        const parsed = JSON.parse(raw) as { items?: unknown[] };
        return Array.isArray(parsed.items) ? parsed.items.length : -1;
      } catch {
        return -1;
      }
    }, CART_STORAGE_KEY);
    expect(cartItemCount).toBe(0);

    const order = await findLatestOrderByCustomerName(customerName);
    expect(order).not.toBeNull();
    expect(order?.status).toBe("PENDING");
    expect(order?.source).toBe("DIRECT");
    expect(order?.customerName).toBe(customerName);
    expect(order?.totalCents).toBeGreaterThan(0);
    expect(order?.whatsappMessage ?? "").toContain("Novo pedido");
  });

  test("applies minimum only to delivery; pickup below minimum succeeds", async ({
    page,
  }) => {
    const PRODUCT_PRICE_CENTS = 700;
    const MINIMUM_ORDER_CENTS = 5_000;
    const stamp = Date.now();
    const productName = `E2E Checkout Min Coke ${stamp}`;
    const customerName = uniqueCustomerName("MinOrder Pickup");

    const originalMinimum =
      await getOfficialStoreMinimumOrderAmountCentsForE2e();

    try {
      await setOfficialStoreMinimumOrderAmountCentsForE2e(MINIMUM_ORDER_CENTS);

      const category = await createE2eMenuCategory({
        name: `E2E Checkout Min Cat ${stamp}`,
      });
      await createE2eMenuProduct({
        categoryId: category.id,
        storeId: category.storeId,
        name: productName,
        priceCents: PRODUCT_PRICE_CENTS,
      });

      await addProductToCartByName(page, productName, { quantity: 1 });
      await page.getByTestId("checkout-cta").click();
      await expect(page).toHaveURL(/\/na-brasa\/checkout/);

      await page.getByLabel("Nome").fill(customerName);
      await page.getByLabel("WhatsApp para contato").fill(e2ePhone);
      await page.getByText("Entrega", { exact: true }).click();
      await page.getByLabel(/endereço/i).fill("Rua E2E, 100 — Santos");
      await page.getByText("Pix", { exact: true }).click();

      await expect(
        page.getByTestId("checkout-minimum-order-warning"),
      ).toBeVisible();

      await page.getByTestId("checkout-submit-button").click();
      await expect(page.getByTestId("checkout-error-message")).toContainText(
        /valor mínimo para entrega/i,
      );
      await expect(page).toHaveURL(/\/na-brasa\/checkout/);

      await page.getByText("Retirada", { exact: true }).click();
      await expect(
        page.getByTestId("checkout-minimum-order-warning"),
      ).toHaveCount(0);

      await page.route(/wa\.me|api\.whatsapp\.com/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<!doctype html><title>whatsapp-stub</title><body>ok</body>",
        });
      });

      await Promise.all([
        page.waitForURL(/wa\.me|api\.whatsapp\.com/, {
          timeout: 45_000,
          waitUntil: "commit",
        }),
        page.getByTestId("checkout-submit-button").click(),
      ]);

      const order = await findLatestOrderByCustomerName(customerName);
      expect(order).not.toBeNull();
      expect(order?.deliveryType).toBe("PICKUP");
      expect(order?.source).toBe("DIRECT");
      expect(order?.subtotalCents).toBe(PRODUCT_PRICE_CENTS);
      expect(order?.subtotalCents).toBeLessThan(MINIMUM_ORDER_CENTS);
    } finally {
      if (originalMinimum !== null) {
        await setOfficialStoreMinimumOrderAmountCentsForE2e(originalMinimum);
      }
    }
  });

  test("direct checkout URL with closed store blocks submit and creates no order", async ({
    page,
  }) => {
    const customerName = uniqueCustomerName("Closed Store Checkout");
    const originalIsOpen = await getOfficialStoreIsOpenForE2e();

    try {
      await setOfficialStoreIsOpenForE2e(true);
      await addProductToCartByName(page, PILOT_BURGER_PRODUCT_NAME, {
        quantity: 1,
      });

      await setOfficialStoreIsOpenForE2e(false);
      await page.goto("/na-brasa/checkout");

      await expect(page.getByTestId("checkout-store-closed-banner")).toBeVisible();
      await expect(page.getByTestId("checkout-submit-button")).toBeDisabled();

      await page.getByLabel("Nome").fill(customerName);
      await page.getByLabel("WhatsApp para contato").fill(e2ePhone);
      await page.getByText("Retirada", { exact: true }).click();
      await page.getByText("Pix", { exact: true }).click();
      await page.getByTestId("checkout-submit-button").click({ force: true });

      await expect(page).toHaveURL(/\/na-brasa\/checkout/);
      const order = await findLatestOrderByCustomerName(customerName);
      expect(order).toBeNull();

      await setOfficialStoreIsOpenForE2e(true);
      await page.goto("/na-brasa/checkout");
      await expect(page.getByTestId("checkout-store-closed-banner")).toHaveCount(
        0,
      );
      await expect(page.getByTestId("checkout-submit-button")).toBeEnabled();
    } finally {
      if (originalIsOpen !== null) {
        await setOfficialStoreIsOpenForE2e(originalIsOpen);
      }
    }
  });

  test("legacy store with no Online modalities shows unavailable state", async ({
    page,
  }) => {
    const customerName = uniqueCustomerName("No Modalities Checkout");
    const originalModalities = await getOfficialStoreOnlineModalitiesForE2e();
    const originalIsOpen = await getOfficialStoreIsOpenForE2e();

    try {
      await setOfficialStoreIsOpenForE2e(true);
      await setOfficialStoreOnlineModalitiesForE2e({
        pickupEnabled: true,
        deliveryEnabled: true,
      });
      await addProductToCartByName(page, PILOT_BURGER_PRODUCT_NAME, {
        quantity: 1,
      });

      await setOfficialStoreOnlineModalitiesForE2e({
        pickupEnabled: false,
        deliveryEnabled: false,
      });
      await page.goto("/na-brasa/checkout");

      await expect(page.getByTestId("checkout-online-unavailable")).toBeVisible();
      await expect(page.getByTestId("checkout-online-unavailable")).toContainText(
        /Pedidos Online estão temporariamente indisponíveis/i,
      );
      await expect(page.getByTestId("checkout-submit-button")).toHaveCount(0);
      await expect(page.getByRole("radio")).toHaveCount(0);

      await page.goto("/na-brasa");
      await expect(page.getByTestId("store-hero")).toBeVisible();

      const order = await findLatestOrderByCustomerName(customerName);
      expect(order).toBeNull();
    } finally {
      if (originalModalities) {
        await setOfficialStoreOnlineModalitiesForE2e(originalModalities);
      }
      if (originalIsOpen !== null) {
        await setOfficialStoreIsOpenForE2e(originalIsOpen);
      }
    }
  });
});
