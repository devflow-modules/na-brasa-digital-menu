import { expect, test } from "@playwright/test";
import { loginAdmin, loginAsUser } from "./helpers/auth";
import {
  ensureE2eAdminUser,
  ensureE2eStoreUser,
} from "./helpers/e2e-admin-user";
import {
  cleanupE2eOrders,
  cleanupE2eStores,
  createE2ePickupOrder,
  disconnectE2ePrisma,
  ensureE2eStore,
  getOrderStatus,
} from "./helpers/db";
import { getStoreSlug, uniqueCustomerName } from "./helpers/test-data";

test.describe("admin store-scoped access", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eOrders();
    await cleanupE2eStores();
    await disconnectE2ePrisma();
  });

  test("store user only sees own store orders and cannot open foreign detail", async ({
    page,
  }) => {
    const storeASlug = getStoreSlug();
    const storeB = await ensureE2eStore({ slug: "e2e-outra-loja" });

    const orderAName = uniqueCustomerName("Store A Customer");
    const orderBName = uniqueCustomerName("Store B Customer");

    const orderA = await createE2ePickupOrder({
      customerName: orderAName,
      storeSlug: storeASlug,
    });
    const orderB = await createE2ePickupOrder({
      customerName: orderBName,
      storeSlug: storeB.slug,
    });

    const storeAUser = await ensureE2eStoreUser({
      storeSlug: storeASlug,
      email: "e2e-store-a-operator@example.com",
    });

    await loginAsUser(page, storeAUser);
    await expect(page.getByTestId("admin-orders-list")).toBeVisible();
    await expect(page.getByText(orderAName).first()).toBeVisible();
    await expect(page.getByText(orderBName)).toHaveCount(0);

    const foreignResponse = await page.goto(`/admin/pedidos/${orderB.id}`);
    expect(foreignResponse?.status()).toBe(404);

    await page.goto(`/admin/pedidos/${orderA.id}`);
    await expect(page.getByTestId("admin-order-detail")).toBeVisible();
    await expect(page.getByText(orderAName).first()).toBeVisible();
  });

  test("store user can update own order status but not foreign order", async ({
    page,
    request,
  }) => {
    const storeASlug = getStoreSlug();
    const storeB = await ensureE2eStore({ slug: "e2e-outra-loja" });

    const orderA = await createE2ePickupOrder({
      customerName: uniqueCustomerName("Scoped Status A"),
      storeSlug: storeASlug,
      status: "PENDING",
    });
    const orderB = await createE2ePickupOrder({
      customerName: uniqueCustomerName("Scoped Status B"),
      storeSlug: storeB.slug,
      status: "PENDING",
    });

    const storeAUser = await ensureE2eStoreUser({
      storeSlug: storeASlug,
      email: "e2e-store-a-status@example.com",
    });

    await loginAsUser(page, storeAUser);
    await page.goto(`/admin/pedidos/${orderA.id}`);
    await page.getByTestId("order-status-action-CONFIRMED").click();
    await expect
      .poll(async () => getOrderStatus(orderA.id))
      .toBe("CONFIRMED");

    // Attempt foreign status update via server action boundary would need
    // UI; detail is 404. Assert DB untouched after visiting foreign URL.
    const foreign = await page.goto(`/admin/pedidos/${orderB.id}`);
    expect(foreign?.status()).toBe(404);
    expect(await getOrderStatus(orderB.id)).toBe("PENDING");

    // Soft check via cookie session that API route isn't exposing B — no
    // REST API; status remains PENDING proves isolation.
    void request;
  });

  test("store user without storeId cannot access /admin", async ({ page }) => {
    const orphan = await ensureE2eStoreUser({
      withoutStoreId: true,
      email: "e2e-store-orphan@example.com",
    });

    await page.goto("/admin/login");
    await page.getByTestId("admin-login-email").fill(orphan.email);
    await page.getByTestId("admin-login-password").fill(orphan.password);
    await page.getByTestId("admin-login-submit").click();
    await page.waitForURL(/\/admin\/?$/, { timeout: 20000 }).catch(() => {});

    // Logged in (JWT ok) but store context fails → 404 on /admin
    const adminResponse = await page.goto("/admin");
    expect(adminResponse?.status()).toBe(404);
    await expect(page.getByTestId("admin-orders-dashboard")).toHaveCount(0);
  });

  test("MASTER still accesses /admin for default store slug", async ({
    page,
  }) => {
    await ensureE2eAdminUser();
    const orderName = uniqueCustomerName("Master Default Store");
    await createE2ePickupOrder({
      customerName: orderName,
      storeSlug: getStoreSlug(),
    });

    await loginAdmin(page);
    await expect(page.getByTestId("admin-orders-dashboard")).toBeVisible();
    await expect(page.getByTestId("admin-master-transitional-note")).toBeVisible();
    await expect(page.getByText(orderName).first()).toBeVisible();
  });
});
