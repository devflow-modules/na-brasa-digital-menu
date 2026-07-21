import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import {
  cleanupE2eOrders,
  cleanupE2eStores,
  createE2ePickupOrder,
  disconnectE2ePrisma,
  ensureE2eStore,
} from "./helpers/db";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import { uniqueCustomerName } from "./helpers/test-data";

test.describe("admin access-denied UX", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eOrders();
    await cleanupE2eStores();
    await disconnectE2ePrisma();
  });

  test("KITCHEN sees explicit denial on Balcão and returns to Pedidos", async ({
    page,
  }) => {
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-access-denied-kitchen@example.com",
    });

    await loginAsUser(page, kitchen);

    const response = await page.goto("/admin/balcao");
    expect(response?.status()).toBe(200);

    await expect(page.getByTestId("admin-chrome")).toBeVisible();
    const denied = page.getByTestId("admin-access-denied");
    await expect(denied).toBeVisible();
    await expect(page.getByTestId("admin-access-denied-title")).toHaveText(
      "Acesso não permitido",
    );
    await expect(
      page.getByTestId("admin-access-denied-description"),
    ).toHaveText("Seu perfil não possui acesso a esta área.");
    await expect(denied.getByText("permission")).toHaveCount(0);
    await expect(denied.getByText("KITCHEN")).toHaveCount(0);
    await expect(denied.getByText("403")).toHaveCount(0);
    await expect(page.getByTestId("admin-counter-order-page")).toHaveCount(0);

    const safeLink = page.getByTestId("admin-access-denied-safe-link");
    await expect(safeLink).toHaveText("Voltar para Pedidos");
    await safeLink.click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("admin-orders-dashboard")).toBeVisible();
    await expect(page.getByTestId("admin-user-menu-trigger")).toBeVisible();
  });

  test("unauthenticated Balcão visit keeps login redirect", async ({ page }) => {
    await page.goto("/admin/balcao");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByTestId("admin-login-form")).toBeVisible();
    await expect(page.getByTestId("admin-access-denied")).toHaveCount(0);
  });

  test("missing order and foreign-store order stay concealed as not found", async ({
    page,
  }) => {
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-access-denied-kitchen-conceal@example.com",
    });
    const foreignStore = await ensureE2eStore({
      slug: "e2e-access-denied-foreign",
    });
    const foreignOrder = await createE2ePickupOrder({
      customerName: uniqueCustomerName("Access Denied Foreign"),
      storeSlug: foreignStore.slug,
    });

    await loginAsUser(page, kitchen);

    const missing = await page.goto("/admin/pedidos/nonexistent-order-id");
    expect(missing?.status()).toBe(404);
    await expect(page.getByTestId("admin-access-denied")).toHaveCount(0);
    await expect(page.getByTestId("admin-order-detail")).toHaveCount(0);

    const foreign = await page.goto(`/admin/pedidos/${foreignOrder.id}`);
    expect(foreign?.status()).toBe(404);
    await expect(page.getByTestId("admin-access-denied")).toHaveCount(0);
    await expect(page.getByTestId("admin-order-detail")).toHaveCount(0);
    await expect(page.getByText(foreignOrder.id)).toHaveCount(0);
  });

  test("KITCHEN keeps Cardápio read-only without access-denied", async ({
    page,
  }) => {
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-access-denied-kitchen-menu@example.com",
    });

    await loginAsUser(page, kitchen);
    const menu = await page.goto("/admin/cardapio");
    expect(menu?.status()).toBe(200);
    await expect(page.getByTestId("admin-menu-page")).toBeVisible();
    await expect(page.getByTestId("admin-access-denied")).toHaveCount(0);
  });
});
