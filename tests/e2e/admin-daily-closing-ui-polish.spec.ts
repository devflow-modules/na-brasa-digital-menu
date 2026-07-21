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
import {
  expandDailyClosingPreview,
  openDefaultDailyClosingWindow,
  readDailyClosingSummaryText,
} from "./helpers/daily-closing-ui";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";

test.describe("admin daily closing UI polish", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupDailyClosingE2eData();
  });

  test("empty window hides empty detail sections and keeps actions + collapsed preview", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-ui-empty",
      name: "E2E DC UI Empty",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-ui-empty-owner@example.com",
      storeSlug: store.slug,
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    await expect(page.getByTestId("daily-closing-empty")).toBeVisible();
    await expect(page.getByTestId("daily-closing-empty")).toContainText(
      "Nenhuma movimentação encontrada",
    );
    await expect(page.getByTestId("daily-closing-actions")).toBeVisible();
    await expect(page.getByTestId("daily-closing-copy")).toBeVisible();
    await expect(page.getByTestId("daily-closing-open-whatsapp")).toBeVisible();
    await expect(page.getByTestId("daily-closing-download-csv")).toBeVisible();
    await expect(page.getByTestId("daily-closing-payments")).toHaveCount(0);
    await expect(page.getByTestId("daily-closing-fulfillment")).toHaveCount(0);
    await expect(page.getByTestId("daily-closing-products")).toHaveCount(0);
    await expect(page.getByTestId("daily-closing-cancelled")).toHaveCount(0);
    await expect(page.getByTestId("daily-closing-notes")).toBeVisible();

    const preview = page.getByTestId("daily-closing-preview");
    await expect(preview).toHaveJSProperty("open", false);

    await expect(page.getByTestId("daily-closing-card-cancelled")).toHaveAttribute(
      "data-alert",
      "false",
    );

    await page.getByTestId("daily-closing-copy").click();
    await expect(page.getByTestId("daily-closing-copy-success")).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("TOTAL VENDIDO EM PEDIDOS CONCLUÍDOS");

    const href = await page
      .getByTestId("daily-closing-open-whatsapp")
      .getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("daily-closing-download-csv").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^fechamento-operacional-e2e-dc-ui-empty-/,
    );
  });

  test("populated window shows detail sections and cancelled alert state", async ({
    page,
  }) => {
    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-ui-data",
      name: "E2E DC UI Data",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-ui-data-owner@example.com",
      storeSlug: store.slug,
    });

    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:00"),
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 4500,
      deliveryFeeCents: 0,
      totalCents: 4500,
      customerName: uniqueDailyClosingCustomer("UiDone"),
      items: [
        {
          productNameSnapshot: "UI Polish Product",
          quantity: 1,
          unitPriceCents: 4500,
          totalCents: 4500,
        },
      ],
    });

    const cancelled = await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:30"),
      status: "CANCELLED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "CASH",
      subtotalCents: 1200,
      deliveryFeeCents: 0,
      totalCents: 1200,
      customerName: uniqueDailyClosingCustomer("UiCancel"),
      items: [
        {
          productNameSnapshot: "UI Cancel Product",
          quantity: 1,
          unitPriceCents: 1200,
          totalCents: 1200,
        },
      ],
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    await expect(page.getByTestId("daily-closing-empty")).toHaveCount(0);
    await expect(page.getByTestId("daily-closing-detail")).toBeVisible();
    await expect(page.getByTestId("daily-closing-payments")).toContainText("Pix");
    await expect(page.getByTestId("daily-closing-fulfillment")).toContainText(
      "Retirada",
    );
    await expect(page.getByTestId("daily-closing-products")).toContainText(
      "UI Polish Product",
    );
    await expect(page.getByTestId("daily-closing-cancelled")).toContainText(
      cancelled.code,
    );
    await expect(page.getByTestId("daily-closing-card-cancelled")).toHaveAttribute(
      "data-alert",
      "true",
    );

    const preview = page.getByTestId("daily-closing-preview");
    await expect(preview).toHaveJSProperty("open", false);
    await expandDailyClosingPreview(page);
    await expect(preview).toHaveJSProperty("open", true);

    const summary = await readDailyClosingSummaryText(page);
    expect(summary).toContain("UI Polish Product");
    expect(summary).toContain(cancelled.code);
  });
});
