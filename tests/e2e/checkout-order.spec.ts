import { expect, test } from "@playwright/test";
import {
  ensurePilotMenuForE2e,
  findLatestOrderByCustomerName,
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
});
