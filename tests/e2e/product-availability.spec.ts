import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import {
  cleanupE2eMenuCatalog,
  createE2eMenuCategory,
  createE2eMenuProduct,
  disconnectE2ePrisma,
  getProductById,
  setE2eProductAvailability,
} from "./helpers/db";
import { clearCartStorage } from "./helpers/menu";
import { e2ePhone, uniqueCustomerName } from "./helpers/test-data";

test.describe("product active vs available", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eMenuCatalog();
    await disconnectE2ePrisma();
  });

  test.beforeEach(async ({ page }) => {
    await clearCartStorage(page);
  });

  test("available product can be added to cart from public menu", async ({
    page,
  }) => {
    const category = await createE2eMenuCategory({
      name: `E2E Avail Add Cat ${Date.now()}`,
    });
    const product = await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: `E2E Avail Add ${Date.now()}`,
      active: true,
      available: true,
    });

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: product.name });
    await card.getByTestId("open-add-to-cart-button").click();
    await page.getByTestId("add-to-cart-button").click();
    await expect(page.getByTestId("cart-summary")).toContainText(product.name);
  });

  test("public menu shows unavailable product but blocks add to cart", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-availability-manager@example.com",
    });
    const category = await createE2eMenuCategory({
      name: `E2E Avail Category ${Date.now()}`,
    });
    const product = await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: `E2E Avail Public ${Date.now()}`,
      active: true,
      available: true,
    });

    await loginAsUser(page, manager);
    await page.goto("/admin/cardapio");
    await page.getByTestId(`admin-menu-toggle-availability-${product.id}`).click();
    await expect(
      page.getByTestId(`admin-menu-product-availability-${product.id}`),
    ).toContainText("Indisponível", { timeout: 15_000 });

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: product.name });
    await expect(card).toBeVisible();
    await expect(card.getByTestId("menu-product-unavailable-badge")).toBeVisible();
    await expect(card.getByTestId("open-add-to-cart-button")).toBeDisabled();
  });

  test("OPERATOR cannot toggle publication (active)", async ({ page }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-availability-operator-active@example.com",
    });
    const category = await createE2eMenuCategory();
    const product = await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
    });

    await loginAsUser(page, operator);
    await page.goto("/admin/cardapio");
    await expect(
      page.getByTestId(`admin-menu-toggle-active-${product.id}`),
    ).toHaveCount(0);
    await expect(
      page.getByTestId(`admin-menu-toggle-availability-${product.id}`),
    ).toHaveCount(1);
  });

  test("checkout blocks order when product became unavailable in cart", async ({
    page,
  }) => {
    const category = await createE2eMenuCategory({
      name: `E2E Avail Checkout Cat ${Date.now()}`,
    });
    const product = await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: `E2E Avail Checkout ${Date.now()}`,
      active: true,
      available: true,
    });

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: product.name });
    await card.getByTestId("open-add-to-cart-button").click();
    await page.getByTestId("add-to-cart-button").click();
    await page.getByTestId("cart-summary").waitFor();

    await setE2eProductAvailability(product.id, false);
    const stillActive = await getProductById(product.id);
    expect(stillActive?.active).toBe(true);
    expect(stillActive?.available).toBe(false);

    await page.getByTestId("checkout-cta").click();
    await expect(page).toHaveURL(/\/na-brasa\/checkout/);

    const customerName = uniqueCustomerName("Unavailable Checkout");
    await page.getByLabel("Nome").fill(customerName);
    await page.getByLabel("WhatsApp para contato").fill(e2ePhone);
    await page.getByText("Retirada", { exact: true }).click();
    await page.getByText("Pix", { exact: true }).click();
    await page.getByTestId("checkout-submit-button").click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Produto indisponível no momento." }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
