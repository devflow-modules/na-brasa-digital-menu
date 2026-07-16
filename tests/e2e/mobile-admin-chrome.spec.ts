import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";

test.describe("mobile admin chrome", () => {
  test("Pixel 5: nav links, logout and chrome remain usable", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-chrome-mobile-manager@example.com",
    });

    await loginAsUser(page, manager);

    await expect(page.getByTestId("admin-chrome")).toBeVisible();
    await expect(page.getByTestId("admin-primary-nav")).toBeVisible();

    const orders = page.getByTestId("admin-orders-nav-link");
    const counter = page.getByTestId("admin-counter-nav-link");
    const logout = page.getByTestId("admin-logout-button");

    await expect(orders).toBeVisible();
    await expect(counter).toBeVisible();
    await expect(logout).toBeVisible();

    const ordersBox = await orders.boundingBox();
    const logoutBox = await logout.boundingBox();
    expect(ordersBox).not.toBeNull();
    expect(logoutBox).not.toBeNull();
    expect(ordersBox!.height).toBeGreaterThanOrEqual(36);
    expect(logoutBox!.height).toBeGreaterThanOrEqual(36);

    await counter.click();
    await expect(page).toHaveURL(/\/admin\/balcao/);
    await expect(counter).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("admin-counter-order-page")).toBeVisible();
    await expect(logout).toBeVisible();
  });
});
