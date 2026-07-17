import { expect, test } from "@playwright/test";
import { loginAdmin, loginAsUser, logoutAdmin } from "./helpers/auth";
import {
  ensureE2eAdminUser,
  ensureE2eStoreUser,
} from "./helpers/e2e-admin-user";
import { getStoreSlug } from "./helpers/test-data";

test.describe("master dashboard", () => {
  test.beforeAll(async () => {
    await ensureE2eAdminUser();
  });

  test("redirects unauthenticated visitors to /admin/login", async ({
    page,
  }) => {
    await page.goto("/master");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByTestId("admin-login-form")).toBeVisible();
  });

  test("MASTER can open /master and see na-brasa store", async ({ page }) => {
    await loginAdmin(page);

    await expect(page).toHaveURL(/\/master\/?$/);
    await expect(page.getByTestId("master-dashboard")).toBeVisible();
    await expect(page.getByTestId("master-summary-cards")).toBeVisible();
    await expect(page.getByTestId("master-landing-note")).toBeVisible();
    await expect(page.getByTestId("master-link-admin-transitional")).toHaveCount(
      0,
    );

    const storeSlug = getStoreSlug();
    await expect(page.getByTestId(`master-store-${storeSlug}`)).toBeVisible();
    await expect(page.getByText(storeSlug, { exact: false }).first()).toBeVisible();
  });


  test("non-MASTER cannot access /master", async ({ page }) => {
    const storeUser = await ensureE2eStoreUser();
    await loginAsUser(page, storeUser);

    const response = await page.goto("/master");

    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("master-dashboard")).toHaveCount(0);
  });

  test("logout from /master returns to login", async ({ page }) => {
    await loginAdmin(page);
    await expect(page.getByTestId("master-dashboard")).toBeVisible();

    await logoutAdmin(page);
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.goto("/master");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
