import { expect, test } from "@playwright/test";
import {
  loginAdmin,
  loginAsUser,
  logoutAdmin,
} from "./helpers/auth";
import {
  ensureE2eAdminUser,
  ensureE2eStoreUser,
} from "./helpers/e2e-admin-user";

test.describe("MASTER landing flow", () => {
  test.beforeAll(async () => {
    await ensureE2eAdminUser();
  });

  test("MASTER login lands on /master without tenant chrome", async ({
    page,
  }) => {
    await loginAdmin(page);

    await expect(page).toHaveURL(/\/master\/?$/);
    await expect(page.getByTestId("master-dashboard")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Painel Master" })).toBeVisible();
    await expect(page.getByTestId("admin-chrome")).toHaveCount(0);
    await expect(page.getByTestId("admin-orders-dashboard")).toHaveCount(0);
    await expect(page.getByTestId("admin-master-transitional-note")).toHaveCount(
      0,
    );
    await expect(page.getByTestId("master-link-admin-transitional")).toHaveCount(
      0,
    );
  });

  test("MASTER direct /admin redirects to /master without pilot Store chrome", async ({
    page,
  }) => {
    await loginAdmin(page);
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/master\/?$/);
    await expect(page.getByTestId("master-dashboard")).toBeVisible();
    await expect(page.getByTestId("admin-chrome")).toHaveCount(0);
    await expect(page.getByTestId("admin-chrome-store-name")).toHaveCount(0);
  });

  test("MASTER can open /master and logout", async ({ page }) => {
    await loginAdmin(page);
    await expect(page.getByTestId("master-dashboard")).toBeVisible();

    await logoutAdmin(page);
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByTestId("admin-login-form")).toBeVisible();
  });

  test("MANAGER login lands on /admin with tenant chrome", async ({ page }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-landing-manager@example.com",
    });

    await loginAsUser(page, manager);
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("admin-chrome")).toBeVisible();
    await expect(page.getByTestId("admin-orders-dashboard")).toBeVisible();
    await expect(page.getByTestId("admin-chrome-store-name")).not.toHaveText("");
  });

  test("OPERATOR and KITCHEN login land on /admin", async ({ page }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-landing-operator@example.com",
    });
    await loginAsUser(page, operator);
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("admin-chrome")).toBeVisible();

    await logoutAdmin(page);

    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-landing-kitchen@example.com",
    });
    await loginAsUser(page, kitchen);
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("admin-chrome")).toBeVisible();
  });

  test("Store user /master stays concealed as not found", async ({ page }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-landing-manager-master-deny@example.com",
    });
    await loginAsUser(page, manager);

    const response = await page.goto("/master");
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("master-dashboard")).toHaveCount(0);
  });

  test("unauthenticated /admin and /master keep login redirect", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.goto("/master");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
