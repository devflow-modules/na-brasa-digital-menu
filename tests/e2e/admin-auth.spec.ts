import { expect, test } from "@playwright/test";
import {
  loginAdmin,
  logoutAdmin,
  readAdminSessionFromBrowser,
} from "./helpers/auth";
import {
  ensureE2eAdminUser,
  ensureInactiveE2eUser,
  getE2eAdminCredentials,
} from "./helpers/e2e-admin-user";

test.describe("admin auth", () => {
  test.beforeAll(async () => {
    await ensureE2eAdminUser();
  });

  test("redirects /admin to login without session", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByTestId("admin-login-form")).toBeVisible();
  });

  test("shows invalid credentials message for wrong password", async ({
    page,
  }) => {
    const { email } = getE2eAdminCredentials();

    await page.goto("/admin/login");
    await page.getByTestId("admin-login-email").fill(email);
    await page.getByTestId("admin-login-password").fill("definitely-wrong");
    await page.getByTestId("admin-login-submit").click();

    await expect(page.getByText("Credenciais inválidas.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("shows invalid credentials message for unknown email", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.getByTestId("admin-login-email").fill("wrong@example.com");
    await page.getByTestId("admin-login-password").fill("definitely-wrong");
    await page.getByTestId("admin-login-submit").click();

    await expect(page.getByText("Credenciais inválidas.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("rejects inactive user with generic credentials error", async ({
    page,
  }) => {
    const inactive = await ensureInactiveE2eUser();

    await page.goto("/admin/login");
    await page.getByTestId("admin-login-email").fill(inactive.email);
    await page.getByTestId("admin-login-password").fill(inactive.password);
    await page.getByTestId("admin-login-submit").click();

    await expect(page.getByText("Credenciais inválidas.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("logs in with database user and session payload claims", async ({
    page,
  }) => {
    const credentials = getE2eAdminCredentials();
    const ensured = await ensureE2eAdminUser(credentials);

    await loginAdmin(page);
    await expect(page).toHaveURL(/\/master\/?$/);
    await expect(page.getByTestId("master-dashboard")).toBeVisible();
    await expect(page.getByTestId("admin-logout-button")).toBeVisible();

    const session = await readAdminSessionFromBrowser(page);
    expect(session.userId).toBe(ensured.userId);
    expect(session.email).toBe(credentials.email);
    expect(session.name.length).toBeGreaterThan(0);
    expect(session.role).toBe("MASTER");
    expect(session.storeId).toBeNull();
  });

  test("logs in and logs out", async ({ page }) => {
    await loginAdmin(page);
    await expect(page).toHaveURL(/\/master\/?$/);
    await expect(page.getByTestId("admin-logout-button")).toBeVisible();

    await logoutAdmin(page);
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.goto("/master");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
