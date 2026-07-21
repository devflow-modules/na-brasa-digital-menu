import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import {
  cleanupE2eOrders,
  createE2ePickupOrder,
  disconnectE2ePrisma,
  getPrisma,
} from "./helpers/db";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import { uniqueCustomerName } from "./helpers/test-data";

test.describe("admin daily closing report", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eOrders();
    await disconnectE2ePrisma();
  });

  test("STORE_OWNER sees report, filters period, and copies WhatsApp summary", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-daily-closing-owner@example.com",
    });

    const order = await createE2ePickupOrder({
      customerName: uniqueCustomerName("Daily Closing Owner"),
      status: "COMPLETED",
    });

    // Place the order inside the operational window for 2026-07-21 17:00–01:00 SP.
    await getPrisma().order.update({
      where: { id: order.id },
      data: { createdAt: new Date("2026-07-21T21:30:00.000Z") },
    });

    await loginAsUser(page, owner);

    await expect(page.getByTestId("admin-reports-nav-link")).toBeVisible();
    await page.getByTestId("admin-reports-nav-link").click();
    await expect(page).toHaveURL(/\/admin\/relatorios\/fechamento/);
    await expect(page.getByTestId("daily-closing-page")).toBeVisible();

    await page.getByTestId("daily-closing-date").fill("2026-07-21");
    await page.getByTestId("daily-closing-start").fill("17:00");
    await page.getByTestId("daily-closing-end").fill("01:00");
    await page.getByTestId("daily-closing-refresh").click();

    await expect(page).toHaveURL(/date=2026-07-21/);
    await expect(page.getByTestId("daily-closing-card-orders")).toContainText(
      "1",
    );
    await expect(page.getByTestId("daily-closing-summary-text")).toContainText(
      "FECHAMENTO OPERACIONAL",
    );
    await expect(page.getByTestId("daily-closing-summary-text")).toContainText(
      "TOTAL VENDIDO EM PEDIDOS CONCLUÍDOS",
    );

    await page.getByTestId("daily-closing-copy").click();
    await expect(page.getByTestId("daily-closing-copy-success")).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("FECHAMENTO OPERACIONAL");
    expect(clipboard).toContain("TOTAL VENDIDO EM PEDIDOS CONCLUÍDOS");
    expect(clipboard).not.toContain(order.customerName);
    expect(clipboard).not.toContain("13988887777");
  });

  test("MANAGER can open the report page", async ({ page }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-daily-closing-manager@example.com",
    });

    await loginAsUser(page, manager);
    await page.goto("/admin/relatorios/fechamento");
    await expect(page.getByTestId("daily-closing-page")).toBeVisible();
    await expect(page.getByTestId("admin-access-denied")).toHaveCount(0);
  });

  test("OPERATOR is denied and does not see Relatórios link", async ({
    page,
  }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-daily-closing-operator@example.com",
    });

    await loginAsUser(page, operator);
    await expect(page.getByTestId("admin-reports-nav-link")).toHaveCount(0);

    const response = await page.goto("/admin/relatorios/fechamento");
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("admin-access-denied")).toBeVisible();
    await expect(page.getByTestId("daily-closing-page")).toHaveCount(0);
  });

  test("KITCHEN is denied and does not see Relatórios link", async ({
    page,
  }) => {
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-daily-closing-kitchen@example.com",
    });

    await loginAsUser(page, kitchen);
    await expect(page.getByTestId("admin-reports-nav-link")).toHaveCount(0);

    const response = await page.goto("/admin/relatorios/fechamento");
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("admin-access-denied")).toBeVisible();
    await expect(page.getByTestId("daily-closing-page")).toHaveCount(0);
  });
});
