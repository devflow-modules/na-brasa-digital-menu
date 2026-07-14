import { expect, test } from "@playwright/test";
import { ensureOfficialStoreDisplayNameForE2e } from "./helpers/db";
import { addFirstProductToCart, clearCartStorage } from "./helpers/menu";
import { CART_STORAGE_KEY, OFFICIAL_STORE_DISPLAY_NAME } from "./helpers/test-data";

test.describe("public menu", () => {
  test.beforeEach(async ({ page }) => {
    await ensureOfficialStoreDisplayNameForE2e();
    await clearCartStorage(page);
  });

  test("loads hero and products", async ({ page }) => {
    await page.goto("/na-brasa");

    await expect(page.getByTestId("store-hero")).toBeVisible();
    await expect(
      page.getByTestId("store-hero").getByRole("heading", { level: 1 }),
    ).toHaveText(OFFICIAL_STORE_DISPLAY_NAME);
    await expect(page.getByTestId("menu-product-card").first()).toBeVisible();
  });

  test("adds product to cart, shows subtotal, preserves on reload, and opens checkout", async ({
    page,
  }) => {
    await addFirstProductToCart(page);

    const cartSummary = page.getByTestId("cart-summary");
    await expect(cartSummary).toBeVisible();
    await expect(page.getByTestId("cart-subtotal")).toBeVisible();
    await expect(page.getByText(/1 item/)).toBeVisible();

    const storedBeforeReload = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      CART_STORAGE_KEY,
    );
    expect(storedBeforeReload).toBeTruthy();

    await page.reload();
    await expect(page.getByTestId("cart-summary")).toBeVisible();
    await expect(page.getByText(/1 item/)).toBeVisible();

    await page.getByTestId("checkout-cta").click();
    await expect(page).toHaveURL(/\/na-brasa\/checkout/);
  });
});
