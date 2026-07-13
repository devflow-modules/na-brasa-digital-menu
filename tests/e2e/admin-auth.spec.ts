import { expect, test } from "@playwright/test";
import { loginAdmin, logoutAdmin } from "./helpers/auth";

test.describe("admin auth", () => {
  test("redirects /admin to login without session", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByTestId("admin-login-form")).toBeVisible();
  });

  test("shows invalid credentials message", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByTestId("admin-login-email").fill("wrong@example.com");
    await page.getByTestId("admin-login-password").fill("definitely-wrong");
    await page.getByTestId("admin-login-submit").click();

    await expect(page.getByText("Credenciais inválidas.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("logs in and logs out", async ({ page }) => {
    await loginAdmin(page);
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("admin-logout-button")).toBeVisible();

    await logoutAdmin(page);
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
