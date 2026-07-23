import { expect, test, type Page } from "@playwright/test";
import { attemptLinkAddonToProduct } from "./helpers/admin-addon-service";
import { loginAsUser } from "./helpers/auth";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import {
  cleanupE2eAddons,
  cleanupE2eMenuCatalog,
  createE2eAddon,
  createE2eMenuCategory,
  createE2eMenuProduct,
  disconnectE2ePrisma,
  ensureE2eStore,
  getAddonById,
  linkE2eAddonToProduct,
  unlinkE2eAddonFromProduct,
} from "./helpers/db";
import { loadLocalEnvFile } from "./helpers/load-env";
import { clearCartStorage } from "./helpers/menu";
import { e2eOrderIdempotencyKey, e2ePhone, getStoreSlug, uniqueCustomerName } from "./helpers/test-data";
import { createOrder } from "@/features/orders/services/create-order.service";

async function openAddonCreateForm(page: Page) {
  await page.getByTestId("admin-addons-show-create").click();
  await expect(page.getByTestId("admin-addons-create-form")).toBeVisible();
}

async function openAddonEditor(page: Page, addonId: string) {
  await expect(page.getByTestId(`admin-addons-edit-form-${addonId}`)).toHaveCount(
    0,
  );
  await page.getByTestId(`admin-addon-edit-${addonId}`).click();
  await expect(page.getByTestId(`admin-addons-edit-form-${addonId}`)).toBeVisible();
}

async function openAddonLinks(page: Page, addonId: string) {
  await expect(page.getByTestId(`admin-addons-links-${addonId}`)).toHaveCount(0);
  await page.getByTestId(`admin-addon-toggle-links-${addonId}`).click();
  await expect(page.getByTestId(`admin-addons-links-${addonId}`)).toBeVisible();
}

test.describe("admin addon management", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eAddons();
    await cleanupE2eMenuCatalog();
    await disconnectE2ePrisma();
  });

  test.beforeEach(async ({ page }) => {
    await clearCartStorage(page);
  });

  test("MANAGER opens addons page and creates addon", async ({ page }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-manager-addon@example.com",
    });

    await loginAsUser(page, manager);
    await page.goto("/admin/cardapio/adicionais");

    await expect(page.getByTestId("admin-addons-page")).toBeVisible();
    await expect(page.getByTestId("admin-addons-create-form")).toHaveCount(0);
    await expect(page.getByTestId("admin-addons-counters")).toBeVisible();
    await expect(page.getByTestId("admin-addons-filters")).toBeVisible();

    await openAddonCreateForm(page);

    const addonName = `E2E Addon Create ${Date.now()}`;
    await page.getByTestId("admin-addons-create-form").locator('[name="name"]').fill(addonName);
    await page.getByTestId("admin-addons-create-form").locator('[name="priceCents"]').fill("4,50");
    await page.getByTestId("admin-addons-create-form").locator('button[type="submit"]').click();

    await expect(
      page.getByTestId("admin-addons-list").locator("p.font-medium", { hasText: addonName }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("admin-addons-create-form")).toHaveCount(0);
  });

  test("MANAGER edits addon and links to product — public menu shows addon", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-manager-addon-edit@example.com",
    });
    const category = await createE2eMenuCategory();
    const product = await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: `E2E Addon Product ${Date.now()}`,
    });
    const addon = await createE2eAddon({
      storeId: category.storeId,
      name: `E2E Addon Link ${Date.now()}`,
      priceCents: 500,
    });

    await loginAsUser(page, manager);
    await page.goto("/admin/cardapio/adicionais");

    await openAddonEditor(page, addon.id);
    const form = page.getByTestId(`admin-addons-edit-form-${addon.id}`);
    await form.locator('[name="name"]').fill(`${addon.name} Updated`);
    await form.locator('[name="priceCents"]').fill("6,00");
    await form.locator('button[type="submit"]').click();
    await expect(page.getByText("R$ 6,00")).toBeVisible({ timeout: 15_000 });

    await openAddonLinks(page, addon.id);
    await page
      .getByTestId(`admin-addons-link-select-${addon.id}`)
      .selectOption(product.id);
    await page.getByTestId(`admin-addons-link-submit-${addon.id}`).click();
    await expect(
      page.getByTestId(`admin-addons-linked-product-${addon.id}-${product.id}`),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto("/na-brasa");
    const card = page.getByTestId("menu-product-card").filter({ hasText: product.name });
    await card.getByTestId("open-add-to-cart-button").click();
    await expect(page.getByTestId(`menu-addon-option-${addon.id}`)).toBeVisible();
  });

  test("inactive addon hidden on public menu", async ({ page }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-manager-addon-inactive@example.com",
    });
    const category = await createE2eMenuCategory();
    const product = await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: `E2E Addon Product Inactive ${Date.now()}`,
    });
    const addon = await createE2eAddon({ storeId: category.storeId });
    await linkE2eAddonToProduct(product.id, addon.id);

    await loginAsUser(page, manager);
    await page.goto("/admin/cardapio/adicionais");
    await page.getByTestId(`admin-addon-toggle-active-${addon.id}`).click();
    await expect(page.getByTestId(`admin-addon-status-${addon.id}`)).toContainText(
      "Inativo",
      { timeout: 15_000 },
    );

    await page.goto("/na-brasa");
    const card = page.getByTestId("menu-product-card").filter({ hasText: product.name });
    await card.getByTestId("open-add-to-cart-button").click();
    await expect(page.getByTestId(`menu-addon-option-${addon.id}`)).toHaveCount(0);
  });

  test("workspace keeps one editor and one links panel at a time", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-manager-addon-workspace@example.com",
    });
    const addonA = await createE2eAddon({
      name: `E2E Addon Workspace A ${Date.now()}`,
    });
    const addonB = await createE2eAddon({
      name: `E2E Addon Workspace B ${Date.now()}`,
    });

    await loginAsUser(page, manager);
    await page.goto("/admin/cardapio/adicionais");

    await expect(page.getByTestId(`admin-addons-edit-form-${addonA.id}`)).toHaveCount(
      0,
    );
    await expect(page.getByTestId(`admin-addons-links-${addonA.id}`)).toHaveCount(0);

    await openAddonEditor(page, addonA.id);
    await openAddonLinks(page, addonA.id);
    await expect(page.getByTestId(`admin-addons-edit-form-${addonA.id}`)).toHaveCount(
      0,
    );
    await expect(page.getByTestId(`admin-addons-links-${addonA.id}`)).toBeVisible();

    await openAddonEditor(page, addonB.id);
    await expect(page.getByTestId(`admin-addons-edit-form-${addonB.id}`)).toBeVisible();
    await expect(page.getByTestId(`admin-addons-edit-form-${addonA.id}`)).toHaveCount(
      0,
    );
    await expect(page.getByTestId(`admin-addons-links-${addonA.id}`)).toHaveCount(0);

    await page.getByTestId("admin-addons-search").fill(addonA.name);
    await expect(page.getByTestId(`admin-addon-${addonA.id}`)).toBeVisible();
    await expect(page.getByTestId(`admin-addon-${addonB.id}`)).toHaveCount(0);

    await page.getByTestId("admin-addons-clear-filters").click();
    await expect(page.getByTestId(`admin-addon-${addonB.id}`)).toBeVisible();
  });

  test("OPERATOR read-only on addons page", async ({ page }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-store-operator-addon@example.com",
    });
    const addon = await createE2eAddon();

    await loginAsUser(page, operator);
    await page.goto("/admin/cardapio/adicionais");

    await expect(page.getByTestId("admin-addons-page")).toBeVisible();
    await expect(page.getByTestId(`admin-addon-${addon.id}`)).toBeVisible();
    await expect(page.getByTestId("admin-addons-show-create")).toHaveCount(0);
    await expect(page.getByTestId("admin-addons-create-form")).toHaveCount(0);
    await expect(page.getByTestId(`admin-addon-edit-${addon.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`admin-addon-toggle-active-${addon.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`admin-addons-link-submit-${addon.id}`)).toHaveCount(0);
  });

  test("KITCHEN read-only on addons page", async ({ page }) => {
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-store-kitchen-addon@example.com",
    });
    const addon = await createE2eAddon();

    await loginAsUser(page, kitchen);
    await page.goto("/admin/cardapio/adicionais");

    await expect(page.getByTestId(`admin-addon-${addon.id}`)).toBeVisible();
    await expect(page.getByTestId("admin-addons-show-create")).toHaveCount(0);
    await expect(page.getByTestId("admin-addons-create-form")).toHaveCount(0);
    await expect(page.getByTestId(`admin-addon-toggle-active-${addon.id}`)).toHaveCount(0);
  });

  test("store A cannot link addon to product from store B", async () => {
    const foreignStore = await ensureE2eStore({ slug: "e2e-addon-foreign-store" });
    const foreignCategory = await createE2eMenuCategory({
      storeSlug: foreignStore.slug,
      name: `E2E Addon Category Foreign ${Date.now()}`,
    });
    const foreignProduct = await createE2eMenuProduct({
      categoryId: foreignCategory.id,
      storeId: foreignCategory.storeId,
    });
    const managerA = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-manager-addon-scope@example.com",
      storeSlug: "na-brasa",
    });
    const addonA = await createE2eAddon({ storeId: managerA.storeId! });

    const denied = await attemptLinkAddonToProduct({
      storeId: managerA.storeId!,
      role: "MANAGER",
      addonId: addonA.id,
      productId: foreignProduct.id,
    });

    expect(denied.ok).toBe(false);
    if (!denied.ok && denied.message) {
      expect(denied.message).toContain("não encontrado");
    }
  });

  test("create order rejects unlinked or inactive addon server-side", async () => {
    loadLocalEnvFile();
    const category = await createE2eMenuCategory();
    const product = await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: `E2E Addon Product Order ${Date.now()}`,
    });
    const addon = await createE2eAddon({ storeId: category.storeId });
    await linkE2eAddonToProduct(product.id, addon.id);
    await unlinkE2eAddonFromProduct(product.id, addon.id);

    const unlinked = await createOrder({
      storeSlug: getStoreSlug(),
      customerName: uniqueCustomerName("Addon Unlinked"),
      customerPhone: e2ePhone,
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      idempotencyKey: e2eOrderIdempotencyKey(),
      items: [{ productId: product.id, quantity: 1, addonIds: [addon.id] }],
    });
    expect(unlinked.ok).toBe(false);
    if (!unlinked.ok) {
      expect(unlinked.message).toBe("Adicional indisponível para este produto.");
    }

    await linkE2eAddonToProduct(product.id, addon.id);
    const prisma = (await import("./helpers/db")).getPrisma();
    await prisma.addon.update({
      where: { id: addon.id },
      data: { active: false },
    });

    const inactive = await createOrder({
      storeSlug: getStoreSlug(),
      customerName: uniqueCustomerName("Addon Inactive"),
      customerPhone: e2ePhone,
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      idempotencyKey: e2eOrderIdempotencyKey(),
      items: [{ productId: product.id, quantity: 1, addonIds: [addon.id] }],
    });
    expect(inactive.ok).toBe(false);
    if (!inactive.ok) {
      expect(inactive.message).toBe("Adicional indisponível para este produto.");
    }

    const restored = await getAddonById(addon.id);
    expect(restored?.active).toBe(false);
  });
});
