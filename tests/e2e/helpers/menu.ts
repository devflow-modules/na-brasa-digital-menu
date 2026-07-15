import type { Page } from "@playwright/test";
import { CART_STORAGE_KEY } from "./test-data";

export async function openAddToCartForProduct(
  page: Page,
  productName: string,
): Promise<void> {
  await page.goto("/na-brasa");
  await page.getByTestId("store-hero").waitFor();
  const card = page
    .getByTestId("menu-product-card")
    .filter({ hasText: productName });
  await card.first().waitFor();
  await card.first().getByTestId("open-add-to-cart-button").click();
}

export async function addProductToCartByName(
  page: Page,
  productName: string,
  options?: { quantity?: number },
): Promise<void> {
  const quantity = Math.max(1, options?.quantity ?? 1);
  await openAddToCartForProduct(page, productName);
  await page.getByTestId("add-to-cart-button").click();
  await page.getByTestId("cart-summary").waitFor();

  const increaseButton = page
    .getByRole("button", { name: new RegExp(`^Aumentar ${productName}`) })
    .first();
  for (let i = 1; i < quantity; i++) {
    await increaseButton.click();
  }
}

export async function addFirstProductToCart(
  page: Page,
  options?: { quantity?: number },
): Promise<void> {
  const quantity = Math.max(1, options?.quantity ?? 1);

  await page.goto("/na-brasa");
  await page.getByTestId("store-hero").waitFor();
  await page.getByTestId("menu-product-card").first().waitFor();
  await page.getByTestId("open-add-to-cart-button").first().click();
  await page.getByTestId("add-to-cart-button").click();
  await page.getByTestId("cart-summary").waitFor();

  const increaseButton = page
    .getByRole("button", { name: /^Aumentar / })
    .first();
  for (let i = 1; i < quantity; i++) {
    await increaseButton.click();
  }
}

export async function clearCartStorage(page: Page): Promise<void> {
  await page.goto("/na-brasa");
  await page.evaluate((key) => window.localStorage.removeItem(key), CART_STORAGE_KEY);
}
