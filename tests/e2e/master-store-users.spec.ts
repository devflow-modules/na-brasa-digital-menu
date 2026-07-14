import { expect, test } from "@playwright/test";
import { loginAdmin, loginAsUser, logoutAdmin } from "./helpers/auth";
import {
  ensureE2eAdminUser,
  ensureE2eStoreUser,
} from "./helpers/e2e-admin-user";
import {
  cleanupE2eOrders,
  cleanupE2eStoreUsers,
  disconnectE2ePrisma,
  getPrisma,
} from "./helpers/db";
import { getStoreSlug } from "./helpers/test-data";

test.describe("master store users", () => {
  test.beforeAll(async () => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
    await ensureE2eAdminUser();
  });

  test.afterAll(async () => {
    await cleanupE2eStoreUsers();
    await cleanupE2eOrders();
    await disconnectE2ePrisma();
  });

  test("redirects unauthenticated visitors to /admin/login", async ({
    page,
  }) => {
    const store = await getPrisma().store.findUnique({
      where: { slug: getStoreSlug() },
      select: { id: true },
    });
    expect(store).not.toBeNull();

    await page.goto(`/master/stores/${store!.id}/users`);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("non-MASTER cannot access store users page", async ({ page }) => {
    const store = await getPrisma().store.findUnique({
      where: { slug: getStoreSlug() },
      select: { id: true },
    });
    expect(store).not.toBeNull();

    const storeUser = await ensureE2eStoreUser({
      email: "e2e-store-users-blocked@example.com",
    });
    await loginAsUser(page, storeUser);

    const response = await page.goto(`/master/stores/${store!.id}/users`);
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("master-store-users-page")).toHaveCount(0);
  });

  test("MASTER opens users page from /master link and creates OPERATOR", async ({
    page,
  }) => {
    const storeSlug = getStoreSlug();
    const email = `e2e-master-created-op-${Date.now()}@example.com`;
    const password = "StoreUserPass12";

    await loginAdmin(page);
    await page.goto("/master");
    await page.getByTestId(`master-store-users-link-${storeSlug}`).click();
    await expect(page.getByTestId("master-store-users-page")).toBeVisible();

    await page.getByTestId("master-create-user-name").fill("E2E Created Operator");
    await page.getByTestId("master-create-user-email").fill(email);
    await page.getByTestId("master-create-user-role").selectOption("OPERATOR");
    await page.getByTestId("master-create-user-password").fill(password);
    await page
      .getByTestId("master-create-user-confirm-password")
      .fill(password);
    await page.getByTestId("master-create-user-submit").click();

    await expect(page.getByTestId("master-create-user-success")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByTestId(`master-store-user-${email}`),
    ).toBeVisible({ timeout: 15_000 });

    await logoutAdmin(page);
    await loginAsUser(page, { email, password });
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("admin-orders-dashboard")).toBeVisible();

    const masterResponse = await page.goto("/master");
    expect(masterResponse?.status()).toBe(404);
  });

  test("duplicate email and MASTER role creation are blocked", async ({
    page,
  }) => {
    const store = await getPrisma().store.findUnique({
      where: { slug: getStoreSlug() },
      select: { id: true },
    });
    expect(store).not.toBeNull();

    const existing = await ensureE2eStoreUser({
      email: "e2e-master-created-dup@example.com",
      password: "StoreUserPass12",
    });

    await loginAdmin(page);
    await page.goto(`/master/stores/${store!.id}/users`);

    await page.getByTestId("master-create-user-name").fill("Dup User");
    await page.getByTestId("master-create-user-email").fill(existing.email);
    await page.getByTestId("master-create-user-role").selectOption("OPERATOR");
    await page.getByTestId("master-create-user-password").fill("StoreUserPass12");
    await page
      .getByTestId("master-create-user-confirm-password")
      .fill("StoreUserPass12");
    await page.getByTestId("master-create-user-submit").click();
    await expect(page.getByTestId("master-create-user-error")).toContainText(
      /e-mail/i,
    );

    // MASTER option must not exist in the create role select.
    const roleOptions = page.getByTestId("master-create-user-role").locator("option");
    await expect(roleOptions).toHaveCount(4);
    await expect(
      page.getByTestId("master-create-user-role").locator('option[value="MASTER"]'),
    ).toHaveCount(0);
  });

  test("inactive store user cannot log in", async ({ page }) => {
    const store = await getPrisma().store.findUnique({
      where: { slug: getStoreSlug() },
      select: { id: true },
    });
    expect(store).not.toBeNull();

    const email = `e2e-master-created-inactive-${Date.now()}@example.com`;
    const password = "StoreUserPass12";

    await loginAdmin(page);
    await page.goto(`/master/stores/${store!.id}/users`);
    await page.getByTestId("master-create-user-name").fill("E2E Inactive Toggle");
    await page.getByTestId("master-create-user-email").fill(email);
    await page.getByTestId("master-create-user-role").selectOption("OPERATOR");
    await page.getByTestId("master-create-user-password").fill(password);
    await page
      .getByTestId("master-create-user-confirm-password")
      .fill(password);
    await page.getByTestId("master-create-user-submit").click();
    await expect(page.getByTestId(`master-store-user-${email}`)).toBeVisible({
      timeout: 15_000,
    });

    const user = await getPrisma().user.findUnique({
      where: { email },
      select: { id: true },
    });
    expect(user).not.toBeNull();

    await page
      .getByTestId(`master-store-user-toggle-active-${user!.id}`)
      .click();
    await expect(page.getByTestId("master-store-users-status")).toContainText(
      /desativado/i,
      { timeout: 15_000 },
    );

    await logoutAdmin(page);
    await page.goto("/admin/login");
    await page.getByTestId("admin-login-email").fill(email);
    await page.getByTestId("admin-login-password").fill(password);
    await page.getByTestId("admin-login-submit").click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
