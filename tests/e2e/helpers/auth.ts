import type { Page } from "@playwright/test";
import { getAdminCredentials } from "./test-data";

export async function loginAdmin(page: Page): Promise<void> {
  const { email, password } = getAdminCredentials();

  await page.goto("/admin/login");
  await page.getByTestId("admin-login-email").fill(email);
  await page.getByTestId("admin-login-password").fill(password);
  await page.getByTestId("admin-login-submit").click();
  await page.waitForURL(/\/admin\/?$/);
}

export async function logoutAdmin(page: Page): Promise<void> {
  await page.getByTestId("admin-logout-button").click();
  await page.waitForURL(/\/admin\/login/);
}
