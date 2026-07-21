import { expect, test } from "@playwright/test";
import { focusAdminMenuCategory } from "./helpers/admin-menu-ui";
import { loginAsUser } from "./helpers/auth";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import {
  cleanupE2eMenuCatalog,
  createE2eMenuCategory,
  createE2eMenuProduct,
  disconnectE2ePrisma,
} from "./helpers/db";

test.describe("admin menu management workspace", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eMenuCatalog();
    await disconnectE2ePrisma();
  });

  test("accordion, on-demand editor, search and filters", async ({ page }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-manager-menu-workspace@example.com",
    });

    const stamp = Date.now();
    const burgers = await createE2eMenuCategory({
      name: `E2E Menu WS Burgers ${stamp}`,
      sortOrder: 0,
    });
    const drinks = await createE2eMenuCategory({
      name: `E2E Menu WS Drinks ${stamp}`,
      sortOrder: 1,
    });

    const bacon = await createE2eMenuProduct({
      categoryId: burgers.id,
      storeId: burgers.storeId,
      name: `E2E Menu WS X-Bacon ${stamp}`,
      priceCents: 2800,
      active: true,
      available: true,
    });
    const soda = await createE2eMenuProduct({
      categoryId: drinks.id,
      storeId: drinks.storeId,
      name: `E2E Menu WS Soda Unique ${stamp}`,
      priceCents: 600,
      active: true,
      available: false,
    });
    const hiddenBurger = await createE2eMenuProduct({
      categoryId: burgers.id,
      storeId: burgers.storeId,
      name: `E2E Menu WS Hidden ${stamp}`,
      priceCents: 2000,
      active: false,
      available: true,
    });

    await loginAsUser(page, manager);
    await page.goto("/admin/cardapio");

    await expect(page.getByTestId("admin-menu-counters")).toContainText("produtos");
    await expect(page.getByTestId("admin-menu-counters")).toContainText("ativos");
    await expect(
      page.getByTestId(`admin-menu-edit-product-form-${bacon.id}`),
    ).toHaveCount(0);

    await focusAdminMenuCategory(page, burgers.id);
    await expect(
      page.getByTestId(`admin-menu-category-${burgers.id}`),
    ).toHaveAttribute("data-open", "true");
    await expect(page.getByTestId(`admin-menu-category-${drinks.id}`)).toHaveCount(
      0,
    );
    await expect(page.getByTestId(`admin-menu-product-${bacon.id}`)).toBeVisible();

    await page.getByTestId("admin-menu-filter-category").selectOption("");
    await page.getByTestId(`admin-menu-category-toggle-${drinks.id}`).click();
    await expect(
      page.getByTestId(`admin-menu-category-${drinks.id}`),
    ).toHaveAttribute("data-open", "true");
    await expect(
      page.getByTestId(`admin-menu-category-${burgers.id}`),
    ).toHaveAttribute("data-open", "false");
    await expect(page.getByTestId(`admin-menu-product-${soda.id}`)).toBeVisible();
    await expect(page.getByTestId(`admin-menu-product-${bacon.id}`)).toHaveCount(0);

    await page.getByTestId(`admin-menu-category-toggle-${burgers.id}`).click();
    await expect(page.getByTestId(`admin-menu-product-${bacon.id}`)).toBeVisible();
    await page.getByTestId(`admin-menu-edit-product-${bacon.id}`).click();
    await expect(
      page.getByTestId(`admin-menu-edit-product-form-${bacon.id}`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`admin-menu-edit-product-form-${hiddenBurger.id}`),
    ).toHaveCount(0);

    await page.getByTestId(`admin-menu-edit-product-${hiddenBurger.id}`).click();
    await expect(
      page.getByTestId(`admin-menu-edit-product-form-${hiddenBurger.id}`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`admin-menu-edit-product-form-${bacon.id}`),
    ).toHaveCount(0);

    await page
      .getByTestId(`admin-menu-cancel-edit-product-${hiddenBurger.id}`)
      .click();
    await expect(
      page.getByTestId(`admin-menu-edit-product-form-${hiddenBurger.id}`),
    ).toHaveCount(0);

    await page.getByTestId("admin-menu-search").fill(`Soda Unique ${stamp}`);
    await expect(page.getByTestId(`admin-menu-product-${soda.id}`)).toBeVisible();
    await expect(page.getByTestId(`admin-menu-product-${bacon.id}`)).toHaveCount(0);
    await expect(
      page.getByTestId(`admin-menu-category-${drinks.id}`),
    ).toHaveAttribute("data-open", "true");

    await page.getByTestId("admin-menu-search").fill("produto-inexistente-xyz");
    await expect(page.getByTestId("admin-menu-no-results")).toBeVisible();
    await page.getByTestId("admin-menu-clear-filters").click();

    await page.getByTestId("admin-menu-filter-status").selectOption("unavailable");
    await page.getByTestId("admin-menu-search").fill(`Soda Unique ${stamp}`);
    await expect(page.getByTestId(`admin-menu-product-${soda.id}`)).toBeVisible();
    await expect(page.getByTestId(`admin-menu-product-${bacon.id}`)).toHaveCount(0);

    await page.getByTestId("admin-menu-clear-filters").click();
    await focusAdminMenuCategory(page, burgers.id);
    await expect(page.getByTestId(`admin-menu-product-${bacon.id}`)).toBeVisible();
    await expect(page.getByTestId(`admin-menu-category-${drinks.id}`)).toHaveCount(
      0,
    );

    await page.getByTestId("admin-menu-show-create-category").click();
    await expect(page.getByTestId("admin-menu-create-category-form")).toBeVisible();
  });
});
