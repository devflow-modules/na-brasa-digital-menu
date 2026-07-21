import { expect, type Page } from "@playwright/test";

export async function openAdminUserMenu(page: Page): Promise<void> {
  const trigger = page.getByTestId("admin-user-menu-trigger");
  await expect(trigger).toBeVisible();
  const expanded = await trigger.getAttribute("aria-expanded");
  if (expanded !== "true") {
    await trigger.click();
  }
  await expect(page.getByTestId("admin-user-menu-panel")).toBeVisible();
}

export async function expectAdminLogoutVisible(page: Page): Promise<void> {
  await openAdminUserMenu(page);
  await expect(page.getByTestId("admin-logout-button")).toBeVisible();
}

export async function openAdminMobileNav(page: Page): Promise<void> {
  const toggle = page.getByTestId("admin-mobile-nav-toggle");
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }
  await expect(page.getByTestId("admin-mobile-nav")).toBeVisible();
}
