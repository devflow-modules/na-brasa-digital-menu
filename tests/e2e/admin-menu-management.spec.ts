import { expect, test } from "@playwright/test";
import { attemptUpdateMenuProduct } from "./helpers/admin-menu-service";
import { loginAsUser } from "./helpers/auth";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import {
  cleanupE2eMenuCatalog,
  createE2eMenuCategory,
  createE2eMenuProduct,
  disconnectE2ePrisma,
  E2E_MENU_PREFIX,
  ensureE2eStore,
  getProductById,
} from "./helpers/db";

test.describe("admin menu management", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eMenuCatalog();
    await disconnectE2ePrisma();
  });

  test("MANAGER opens /admin/cardapio and creates product", async ({ page }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-manager-menu@example.com",
    });
    const category = await createE2eMenuCategory();
    expect(category.storeId).toBe(manager.storeId);

    await loginAsUser(page, manager);
    await page.goto("/admin/cardapio");

    await expect(page.getByTestId("admin-menu-page")).toBeVisible();
    await expect(page.getByTestId("admin-menu-create-product-form")).toBeVisible();
    await expect(page.getByTestId(`admin-menu-category-${category.id}`)).toBeVisible();

    const productName = `E2E Menu Product Create ${Date.now()}`;
    await page.getByTestId("admin-menu-create-product-form").locator('[name="categoryId"]').selectOption(category.id);
    await page.getByTestId("admin-menu-create-product-form").locator('[name="name"]').fill(productName);
    await page.getByTestId("admin-menu-create-product-form").locator('[name="priceCents"]').fill("25,50");
    await page.getByTestId("admin-menu-create-product-form").locator('button[type="submit"]').click();

    await expect(
      page.getByTestId("admin-menu-product-list").getByText(productName, { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("MANAGER edits product price", async ({ page }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-manager-menu-edit@example.com",
    });
    const category = await createE2eMenuCategory();
    const product = await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: `E2E Menu Product Edit ${Date.now()}`,
      priceCents: 1000,
    });

    await loginAsUser(page, manager);
    await page.goto("/admin/cardapio");

    const form = page.getByTestId(`admin-menu-edit-product-form-${product.id}`);
    await form.locator('[name="priceCents"]').fill("32,00");
    await form.locator('button[type="submit"]').click();

    await expect(page.getByText("R$ 32,00")).toBeVisible({ timeout: 15_000 });
    const updated = await getProductById(product.id);
    expect(updated?.priceCents).toBe(3200);
  });

  test("OPERATOR cannot create or edit product forms", async ({ page }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-store-operator-menu@example.com",
    });
    await createE2eMenuCategory();

    await loginAsUser(page, operator);
    await page.goto("/admin/cardapio");

    await expect(page.getByTestId("admin-menu-page")).toBeVisible();
    await expect(page.getByTestId("admin-menu-create-product-form")).toHaveCount(0);
    await expect(page.getByTestId("admin-menu-create-category-form")).toHaveCount(0);

    await page.goto("/admin");
    await expect(page.getByTestId("admin-menu-nav-link")).toHaveText("Ver cardápio");
  });

  test("OPERATOR toggles product availability", async ({ page }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-store-operator-menu-toggle@example.com",
    });
    const category = await createE2eMenuCategory();
    const product = await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      active: true,
    });

    await loginAsUser(page, operator);
    await page.goto("/admin/cardapio");

    await page.getByTestId(`admin-menu-toggle-availability-${product.id}`).click();
    await expect(
      page.getByTestId(`admin-menu-product-status-${product.id}`),
    ).toContainText("Indisponível", { timeout: 15_000 });

    const updated = await getProductById(product.id);
    expect(updated?.active).toBe(false);
  });

  test("KITCHEN sees menu without edit or toggle actions", async ({ page }) => {
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-store-kitchen-menu@example.com",
    });
    const category = await createE2eMenuCategory();
    const product = await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
    });

    await loginAsUser(page, kitchen);
    await page.goto("/admin/cardapio");

    await expect(page.getByTestId("admin-menu-page")).toBeVisible();
    await expect(page.getByTestId(`admin-menu-product-${product.id}`)).toBeVisible();
    await expect(page.getByTestId(`admin-menu-toggle-availability-${product.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`admin-menu-edit-product-form-${product.id}`)).toHaveCount(0);
  });

  test("store A user cannot update product from store B", async () => {
    const foreignStore = await ensureE2eStore({ slug: "e2e-menu-foreign-store" });
    const foreignCategory = await createE2eMenuCategory({
      storeSlug: foreignStore.slug,
      name: `E2E Menu Category Foreign ${Date.now()}`,
    });
    const foreignProduct = await createE2eMenuProduct({
      categoryId: foreignCategory.id,
      storeId: foreignCategory.storeId,
    });

    const managerA = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-manager-menu-scope@example.com",
      storeSlug: "na-brasa",
    });
    expect(managerA.storeId).toBeTruthy();

    const denied = await attemptUpdateMenuProduct({
      storeId: managerA.storeId!,
      role: "MANAGER",
      productId: foreignProduct.id,
      categoryId: foreignCategory.id,
      name: "Hacked",
      priceCents: "9,99",
    });

    expect(denied.ok).toBe(false);
    const unchanged = await getProductById(foreignProduct.id);
    expect(unchanged?.name).toContain(E2E_MENU_PREFIX);
  });

  test("OPERATOR server-side product update is blocked", async () => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-store-operator-menu-bypass@example.com",
    });
    const category = await createE2eMenuCategory();
    const product = await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      priceCents: 1500,
    });

    const denied = await attemptUpdateMenuProduct({
      storeId: operator.storeId!,
      role: "OPERATOR",
      productId: product.id,
      categoryId: category.id,
      name: "E2E Menu Hacked",
      priceCents: "99,99",
    });

    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.message).toBe(
        "Você não tem permissão para executar esta ação.",
      );
    }
    const unchanged = await getProductById(product.id);
    expect(unchanged?.priceCents).toBe(1500);
  });

  test("inactive E2E product is hidden on public menu", async ({ page }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-manager-menu-public@example.com",
    });
    const category = await createE2eMenuCategory({
      name: `E2E Menu Category Public ${Date.now()}`,
    });
    const product = await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: `E2E Menu Public Visibility ${Date.now()}`,
      active: true,
    });

    await loginAsUser(page, manager);
    await page.goto("/admin/cardapio");
    await page.getByTestId(`admin-menu-toggle-availability-${product.id}`).click();
    await expect(
      page.getByTestId(`admin-menu-product-status-${product.id}`),
    ).toContainText("Indisponível", { timeout: 15_000 });

    await page.goto("/na-brasa");
    await expect(page.getByText(product.name)).toHaveCount(0);
  });
});
