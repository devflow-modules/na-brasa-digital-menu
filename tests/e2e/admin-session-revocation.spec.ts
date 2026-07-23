import { expect, test } from "@playwright/test";
import { loginAsUser, loginAdmin } from "./helpers/auth";
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

test.describe("admin session revocation", () => {
  test.beforeAll(async () => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
    await ensureE2eAdminUser();
  });

  test.afterAll(async () => {
    await cleanupE2eStoreUsers();
    await cleanupE2eOrders();
    await disconnectE2ePrisma();
  });

  test("deactivating user A invalidates A session while user B stays authenticated", async ({
    browser,
  }) => {
    const store = await getPrisma().store.findUnique({
      where: { slug: getStoreSlug() },
      select: { id: true },
    });
    expect(store).not.toBeNull();

    const password = "StoreUserPass12";
    const userA = await ensureE2eStoreUser({
      email: `e2e-revoke-a-${Date.now()}@example.com`,
      password,
    });
    const userB = await ensureE2eStoreUser({
      email: `e2e-revoke-b-${Date.now()}@example.com`,
      password,
    });

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await loginAsUser(pageA, userA);
      await loginAsUser(pageB, userB);
      await expect(pageA.getByTestId("admin-orders-dashboard")).toBeVisible();
      await expect(pageB.getByTestId("admin-orders-dashboard")).toBeVisible();

      const masterPage = await browser.newPage();
      await loginAdmin(masterPage);
      await masterPage.goto(`/master/stores/${store!.id}/users`);

      const userRow = await getPrisma().user.findUnique({
        where: { email: userA.email },
        select: { id: true },
      });
      expect(userRow).not.toBeNull();

      await masterPage
        .getByTestId(`master-store-user-toggle-active-${userRow!.id}`)
        .click();
      await expect(
        masterPage.getByTestId("master-store-users-status"),
      ).toContainText(/desativado/i, { timeout: 15_000 });
      await masterPage.close();

      await pageA.goto("/admin");
      await expect(pageA).toHaveURL(/\/admin\/login/, { timeout: 15_000 });

      await pageB.reload();
      await expect(pageB.getByTestId("admin-orders-dashboard")).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
