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
  applyDailyClosingFilters,
  openDefaultDailyClosingWindow,
} from "./helpers/daily-closing-ui";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";

test.describe("admin daily closing copy", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupDailyClosingE2eData();
  });

  test("clipboard contains required sections and open-order warning", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-copy",
      name: "E2E DC Copy",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-copy-owner@example.com",
      storeSlug: store.slug,
    });

    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:00"),
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 3200,
      deliveryFeeCents: 0,
      totalCents: 3200,
      customerName: uniqueDailyClosingCustomer("Copy Done"),
      items: [
        {
          productNameSnapshot: "Copy Window A Product",
          quantity: 1,
          unitPriceCents: 3200,
          totalCents: 3200,
        },
      ],
    });

    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:30"),
      status: "PENDING",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 9100,
      deliveryFeeCents: 0,
      totalCents: 9100,
      customerName: uniqueDailyClosingCustomer("Copy Open"),
      items: [
        {
          productNameSnapshot: "Copy Open Product",
          quantity: 1,
          unitPriceCents: 9100,
          totalCents: 9100,
        },
      ],
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    await page.getByTestId("daily-closing-copy").click();
    await expect(page.getByTestId("daily-closing-copy-success")).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("FECHAMENTO OPERACIONAL");
    expect(clipboard).toContain("Data operacional");
    expect(clipboard).toContain("Período");
    expect(clipboard).toContain("TOTAL VENDIDO EM PEDIDOS CONCLUÍDOS");
    expect(clipboard).toContain("FORMAS DE PAGAMENTO");
    expect(clipboard).toContain("MODALIDADES");
    expect(clipboard).toContain("PRODUTOS");
    expect(clipboard).toContain("Copy Window A Product");
    expect(clipboard).toContain("ainda aberto");
    expect(clipboard).toContain("não está incluído no total");
    expect(clipboard).not.toContain("91,00");
    expect(clipboard).not.toContain("Copy Open Product");
  });

  test("copy after filter change reflects only the new window", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-copy-filter",
      name: "E2E DC Copy Filter",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-copy-filter-owner@example.com",
      storeSlug: store.slug,
    });

    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:00"),
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 2100,
      deliveryFeeCents: 0,
      totalCents: 2100,
      customerName: uniqueDailyClosingCustomer("Filter A"),
      items: [
        {
          productNameSnapshot: "Copy Filter Product A",
          quantity: 1,
          unitPriceCents: 2100,
          totalCents: 2100,
        },
      ],
    });

    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc("2026-07-22", "18:00"),
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "CASH",
      subtotalCents: 5400,
      deliveryFeeCents: 0,
      totalCents: 5400,
      customerName: uniqueDailyClosingCustomer("Filter B"),
      items: [
        {
          productNameSnapshot: "Copy Filter Product B",
          quantity: 1,
          unitPriceCents: 5400,
          totalCents: 5400,
        },
      ],
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    await page.getByTestId("daily-closing-copy").click();
    await expect(page.getByTestId("daily-closing-copy-success")).toBeVisible();
    const clipboardA = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardA).toContain("*Data operacional:* 21/07/2026");
    expect(clipboardA).toContain("*Período:* 17:00–01:00");
    expect(clipboardA).toContain("Copy Filter Product A");
    expect(clipboardA).not.toContain("Copy Filter Product B");

    await applyDailyClosingFilters(page, {
      date: "2026-07-22",
      start: "17:00",
      end: "01:00",
    });

    await expect(page.getByTestId("daily-closing-products")).toContainText(
      "Copy Filter Product B",
    );
    await expect(page.getByTestId("daily-closing-page")).not.toContainText(
      "Copy Filter Product A",
    );

    await page.getByTestId("daily-closing-copy").click();
    await expect(page.getByTestId("daily-closing-copy-success")).toBeVisible();
    const clipboardB = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardB).toContain("*Data operacional:* 22/07/2026");
    expect(clipboardB).toContain("*Período:* 17:00–01:00");
    expect(clipboardB).toContain("Copy Filter Product B");
    expect(clipboardB).not.toContain("Copy Filter Product A");
    expect(clipboardB).not.toContain("21,00");
  });
});
