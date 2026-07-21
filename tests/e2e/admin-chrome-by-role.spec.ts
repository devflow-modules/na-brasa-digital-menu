import { expect, test } from "@playwright/test";
import { loginAdmin, loginAsUser } from "./helpers/auth";
import { createE2ePickupOrder } from "./helpers/db";
import {
  ensureE2eAdminUser,
  ensureE2eStoreUser,
} from "./helpers/e2e-admin-user";
import { uniqueCustomerName } from "./helpers/test-data";

async function expectNavActive(page: import("@playwright/test").Page, testId: string) {
  await expect(page.getByTestId(testId)).toHaveAttribute("aria-current", "page");
}

test.describe("role-aware admin chrome", () => {
  test("login has no authenticated chrome", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByTestId("admin-login-form")).toBeVisible();
    await expect(page.getByTestId("admin-chrome")).toHaveCount(0);
    await expect(page.getByTestId("admin-primary-nav")).toHaveCount(0);
    await expect(page.getByTestId("admin-logout-button")).toHaveCount(0);
  });

  test("MANAGER sees full chrome and navigates with active state", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-chrome-manager@example.com",
    });

    await loginAsUser(page, manager);

    await expect(page.getByTestId("admin-chrome")).toBeVisible();
    await expect(page.getByTestId("admin-primary-nav")).toBeVisible();
    await expect(page.getByTestId("admin-orders-nav-link")).toBeVisible();
    await expect(page.getByTestId("admin-counter-nav-link")).toBeVisible();
    await expect(page.getByTestId("admin-reports-nav-link")).toBeVisible();
    await expect(page.getByTestId("admin-menu-nav-link")).toBeVisible();
    await expect(page.getByTestId("admin-settings-nav-link")).toBeVisible();
    await expect(page.getByTestId("admin-logout-button")).toBeVisible();
    await expectNavActive(page, "admin-orders-nav-link");

    await page.getByTestId("admin-counter-nav-link").click();
    await expect(page).toHaveURL(/\/admin\/balcao/);
    await expectNavActive(page, "admin-counter-nav-link");
    await expect(page.getByTestId("admin-orders-nav-link")).not.toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByTestId("admin-reports-nav-link").click();
    await expect(page).toHaveURL(/\/admin\/relatorios\/fechamento/);
    await expectNavActive(page, "admin-reports-nav-link");

    await page.getByTestId("admin-menu-nav-link").click();
    await expect(page).toHaveURL(/\/admin\/cardapio/);
    await expectNavActive(page, "admin-menu-nav-link");

    await page.getByTestId("admin-settings-nav-link").click();
    await expect(page).toHaveURL(/\/admin\/configuracoes/);
    await expectNavActive(page, "admin-settings-nav-link");

    await page.getByTestId("admin-orders-nav-link").click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expectNavActive(page, "admin-orders-nav-link");
  });

  test("OPERATOR chrome matches operational permissions", async ({ page }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-chrome-operator@example.com",
    });

    await loginAsUser(page, operator);

    await expect(page.getByTestId("admin-orders-nav-link")).toBeVisible();
    await expect(page.getByTestId("admin-counter-nav-link")).toBeVisible();
    await expect(page.getByTestId("admin-reports-nav-link")).toHaveCount(0);
    await expect(page.getByTestId("admin-menu-nav-link")).toHaveText(
      "Ver cardápio",
    );
    await expect(page.getByTestId("admin-settings-nav-link")).toBeVisible();
    await expect(page.getByTestId("admin-logout-button")).toBeVisible();
  });

  test("MASTER lands on /master; direct /admin redirects without tenant chrome", async ({
    page,
  }) => {
    await ensureE2eAdminUser();
    await loginAdmin(page);

    await expect(page).toHaveURL(/\/master\/?$/);
    await expect(page.getByTestId("master-dashboard")).toBeVisible();
    await expect(page.getByTestId("admin-chrome")).toHaveCount(0);
    await expect(page.getByTestId("admin-primary-nav")).toHaveCount(0);
    await expect(page.getByTestId("admin-logout-button")).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/master\/?$/);
    await expect(page.getByTestId("master-dashboard")).toBeVisible();
    await expect(page.getByTestId("admin-chrome")).toHaveCount(0);
    await expect(page.getByTestId("admin-master-transitional-note")).toHaveCount(
      0,
    );
  });


  test("KITCHEN chrome shows only Pedidos; URL guards unchanged", async ({
    page,
  }) => {
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-chrome-kitchen@example.com",
    });
    const order = await createE2ePickupOrder({
      customerName: uniqueCustomerName("Chrome Kitchen"),
    });

    await loginAsUser(page, kitchen);

    await expect(page.getByTestId("admin-chrome")).toBeVisible();
    await expect(page.getByTestId("admin-orders-nav-link")).toBeVisible();
    await expect(page.getByTestId("admin-counter-nav-link")).toHaveCount(0);
    await expect(page.getByTestId("admin-reports-nav-link")).toHaveCount(0);
    await expect(page.getByTestId("admin-menu-nav-link")).toHaveCount(0);
    await expect(page.getByTestId("admin-settings-nav-link")).toHaveCount(0);
    await expect(page.getByTestId("admin-logout-button")).toBeVisible();

    await page.goto(`/admin/pedidos/${order.id}`);
    await expect(page.getByTestId("admin-order-detail")).toBeVisible();
    await expectNavActive(page, "admin-orders-nav-link");
    await expect(page.getByTestId("admin-logout-button")).toBeVisible();

    const balcao = await page.goto("/admin/balcao");
    expect(balcao?.status()).toBe(200);
    await expect(page.getByTestId("admin-access-denied")).toBeVisible();
    await expect(page.getByTestId("admin-counter-order-page")).toHaveCount(0);

    const menu = await page.goto("/admin/cardapio");
    expect(menu?.status()).toBe(200);
    await expect(page.getByTestId("admin-menu-page")).toBeVisible();
    await expect(page.getByTestId("admin-menu-nav-link")).toHaveCount(0);
  });
});
