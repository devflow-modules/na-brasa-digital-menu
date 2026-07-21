import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import {
  cleanupDailyClosingE2eData,
  createDailyClosingE2eOrder,
  createDailyClosingE2eStore,
  dailyClosingWallTimeToUtc,
  DAILY_CLOSING_E2E_DATE,
  uniqueDailyClosingCustomer,
} from "./helpers/daily-closing-fixtures";
import { openDefaultDailyClosingWindow } from "./helpers/daily-closing-ui";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";

/**
 * Smoke only — detailed coverage lives in:
 * access / period / aggregation / privacy / copy specs.
 */
test.describe("admin daily closing report smoke", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupDailyClosingE2eData();
  });

  test("owner can open report and copy a WhatsApp summary", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-smoke",
      name: "E2E DC Smoke",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-smoke-owner@example.com",
      storeSlug: store.slug,
    });

    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:00"),
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 1800,
      deliveryFeeCents: 0,
      totalCents: 1800,
      customerName: uniqueDailyClosingCustomer("Smoke"),
      items: [
        {
          productNameSnapshot: "Smoke Product",
          quantity: 1,
          unitPriceCents: 1800,
          totalCents: 1800,
        },
      ],
    });

    await loginAsUser(page, owner);
    await expect(page.getByTestId("admin-reports-nav-link")).toBeVisible();
    await page.getByTestId("admin-reports-nav-link").click();
    await expect(page.getByTestId("daily-closing-page")).toBeVisible();

    await openDefaultDailyClosingWindow(page);
    await expect(page.getByTestId("daily-closing-card-orders")).toContainText(
      "1",
    );

    await page.getByTestId("daily-closing-copy").click();
    await expect(page.getByTestId("daily-closing-copy-success")).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("FECHAMENTO OPERACIONAL");
    expect(clipboard).toContain("TOTAL VENDIDO EM PEDIDOS CONCLUÍDOS");
    expect(clipboard).toContain("Smoke Product");
  });
});
