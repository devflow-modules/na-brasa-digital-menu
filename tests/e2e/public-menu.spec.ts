import { expect, test } from "@playwright/test";
import { ensureOfficialStoreDisplayNameForE2e, ensurePilotMenuForE2e } from "./helpers/db";
import { addFirstProductToCart, clearCartStorage } from "./helpers/menu";
import { CART_STORAGE_KEY, OFFICIAL_STORE_DISPLAY_NAME } from "./helpers/test-data";
import { PILOT_BURGER_PRODUCT_NAME } from "../../prisma/na-braza-pilot-menu";

test.describe("public menu", () => {
  test.beforeEach(async ({ page }) => {
    await ensureOfficialStoreDisplayNameForE2e();
    await ensurePilotMenuForE2e();
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

  test("add-to-cart dialog traps focus, closes with Escape, and restores focus", async ({
    page,
  }) => {
    await page.goto("/na-brasa");
    await page.getByTestId("store-hero").waitFor();

    const productCard = page
      .getByTestId("menu-product-card")
      .filter({ hasText: PILOT_BURGER_PRODUCT_NAME })
      .first();
    const openButton = productCard.getByTestId("open-add-to-cart-button");
    await expect(openButton).toBeEnabled();
    await openButton.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByTestId("add-to-cart-dialog");
    await expect(dialog).toBeVisible();

    const closeButton = dialog.getByTestId("add-to-cart-close-button");
    const confirmButton = dialog.getByTestId("add-to-cart-button");

    const focusInsideDialog = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="add-to-cart-dialog"]');
      const active = document.activeElement;
      return Boolean(panel && active && panel.contains(active));
    });
    expect(focusInsideDialog).toBe(true);

    await closeButton.focus();
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(confirmButton).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(openButton).toBeFocused();
  });

  test("cart remove control exposes contextual accessible name", async ({
    page,
  }) => {
    await addFirstProductToCart(page);
    await expect(
      page.getByRole("button", { name: /Remover .+ do carrinho/ }).first(),
    ).toBeVisible();
  });
});
