import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import {
  cleanupDailyClosingE2eData,
  createDailyClosingE2eOrder,
  createDailyClosingE2eStore,
  dailyClosingReportUrl,
  dailyClosingWallTimeToUtc,
  DAILY_CLOSING_E2E_DATE,
  uniqueDailyClosingCustomer,
} from "./helpers/daily-closing-fixtures";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";

test.describe("admin daily closing access", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupDailyClosingE2eData();
  });

  test("STORE_OWNER opens Relatórios from chrome", async ({ page }) => {
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-access-owner@example.com",
    });

    await loginAsUser(page, owner);
    await expect(page.getByTestId("admin-reports-nav-link")).toBeVisible();
    await page.getByTestId("admin-reports-nav-link").click();
    await expect(page).toHaveURL(/\/admin\/relatorios\/fechamento/);
    await expect(page.getByTestId("daily-closing-page")).toBeVisible();
    await expect(page.getByTestId("admin-access-denied")).toHaveCount(0);
  });

  test("MANAGER opens Relatórios from chrome and direct URL", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-dc-access-manager@example.com",
    });

    await loginAsUser(page, manager);
    await expect(page.getByTestId("admin-reports-nav-link")).toBeVisible();
    await page.getByTestId("admin-reports-nav-link").click();
    await expect(page).toHaveURL(/\/admin\/relatorios\/fechamento/);
    await expect(page.getByTestId("daily-closing-page")).toBeVisible();

    await page.goto(dailyClosingReportUrl());
    await expect(page.getByTestId("daily-closing-page")).toBeVisible();
    await expect(page.getByTestId("admin-access-denied")).toHaveCount(0);
  });

  test("OPERATOR is blocked from Relatórios", async ({ page }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-dc-access-operator@example.com",
    });

    await loginAsUser(page, operator);
    await expect(page.getByTestId("admin-reports-nav-link")).toHaveCount(0);

    const response = await page.goto(dailyClosingReportUrl());
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("admin-access-denied")).toBeVisible();
    await expect(page.getByTestId("daily-closing-page")).toHaveCount(0);
    await expect(page.getByTestId("daily-closing-copy")).toHaveCount(0);
    await expect(page.getByTestId("daily-closing-summary-text")).toHaveCount(0);
  });

  test("KITCHEN is blocked from Relatórios", async ({ page }) => {
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-dc-access-kitchen@example.com",
    });

    await loginAsUser(page, kitchen);
    await expect(page.getByTestId("admin-reports-nav-link")).toHaveCount(0);

    const response = await page.goto(dailyClosingReportUrl());
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("admin-access-denied")).toBeVisible();
    await expect(page.getByTestId("daily-closing-page")).toHaveCount(0);
    await expect(page.getByTestId("daily-closing-copy")).toHaveCount(0);
  });

  test("store A owner cannot see store B orders in report or copy", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const storeA = await createDailyClosingE2eStore({
      slug: "e2e-dc-tenant-a",
      name: "E2E DC Tenant A",
    });
    const storeB = await createDailyClosingE2eStore({
      slug: "e2e-dc-tenant-b",
      name: "E2E DC Tenant B",
    });

    const ownerA = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-tenant-a-owner@example.com",
      storeSlug: storeA.slug,
    });

    const createdAt = dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:00");

    const orderA = await createDailyClosingE2eOrder({
      storeId: storeA.id,
      createdAt,
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 4500,
      deliveryFeeCents: 0,
      totalCents: 4500,
      customerName: uniqueDailyClosingCustomer("TenantA"),
      items: [
        {
          productNameSnapshot: "Produto Loja A Unico",
          quantity: 1,
          unitPriceCents: 4500,
          totalCents: 4500,
        },
      ],
    });

    const orderB = await createDailyClosingE2eOrder({
      storeId: storeB.id,
      createdAt,
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "CASH",
      subtotalCents: 9900,
      deliveryFeeCents: 0,
      totalCents: 9900,
      customerName: uniqueDailyClosingCustomer("TenantB"),
      customerPhone: "13970001111",
      items: [
        {
          productNameSnapshot: "Produto Loja B Segredo",
          quantity: 1,
          unitPriceCents: 9900,
          totalCents: 9900,
        },
      ],
    });

    await loginAsUser(page, ownerA);
    await page.goto(dailyClosingReportUrl());
    await expect(page.getByTestId("daily-closing-page")).toBeVisible();

    await expect(page.getByTestId("daily-closing-card-orders")).toContainText(
      "1",
    );
    await expect(page.getByTestId("daily-closing-card-total")).toContainText(
      "45,00",
    );
    await expect(page.getByTestId("daily-closing-products")).toContainText(
      "Produto Loja A Unico",
    );
    await expect(page.getByTestId("daily-closing-page")).not.toContainText(
      orderB.code,
    );
    await expect(page.getByTestId("daily-closing-page")).not.toContainText(
      "Produto Loja B Segredo",
    );
    await expect(page.getByTestId("daily-closing-page")).not.toContainText(
      "99,00",
    );
    await expect(page.getByTestId("daily-closing-page")).not.toContainText(
      orderB.order.customerName,
    );

    await page.getByTestId("daily-closing-copy").click();
    await expect(page.getByTestId("daily-closing-copy-success")).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("Produto Loja A Unico");
    expect(clipboard).toContain("45,00");
    expect(clipboard).not.toContain(orderB.code);
    expect(clipboard).not.toContain("Produto Loja B Segredo");
    expect(clipboard).not.toContain("99,00");
    expect(clipboard).not.toContain(orderB.order.customerName);
    expect(clipboard).not.toContain("13970001111");
  });
});
