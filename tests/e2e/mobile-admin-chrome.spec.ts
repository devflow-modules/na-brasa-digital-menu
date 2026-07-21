import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import {
  expectAdminLogoutVisible,
  openAdminMobileNav,
} from "./helpers/admin-shell";

test.describe("mobile admin chrome", () => {
  test("Pixel 5: hamburger nav, user menu and shell remain usable", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-chrome-mobile-manager@example.com",
    });

    await loginAsUser(page, manager);

    await expect(page.getByTestId("admin-chrome")).toBeVisible();
    await expect(page.getByTestId("admin-mobile-nav-toggle")).toBeVisible();
    await expect(page.getByTestId("admin-primary-nav")).toBeHidden();

    await openAdminMobileNav(page);

    const orders = page
      .getByTestId("admin-mobile-nav")
      .getByTestId("admin-orders-nav-link");
    const counter = page
      .getByTestId("admin-mobile-nav")
      .getByTestId("admin-counter-nav-link");

    await expect(orders).toBeVisible();
    await expect(counter).toBeVisible();

    const ordersBox = await orders.boundingBox();
    expect(ordersBox).not.toBeNull();
    expect(ordersBox!.height).toBeGreaterThanOrEqual(36);

    await counter.click();
    await expect(page).toHaveURL(/\/admin\/balcao/);
    await expect(page.getByTestId("admin-counter-order-page")).toBeVisible();

    await openAdminMobileNav(page);
    await expect(
      page.getByTestId("admin-mobile-nav").getByTestId("admin-counter-nav-link"),
    ).toHaveAttribute("aria-current", "page");

    await expectAdminLogoutVisible(page);
    const logoutBox = await page.getByTestId("admin-logout-button").boundingBox();
    expect(logoutBox).not.toBeNull();
    expect(logoutBox!.height).toBeGreaterThanOrEqual(36);
  });
});
