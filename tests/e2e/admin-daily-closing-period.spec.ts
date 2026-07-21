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

async function createBoundaryOrder(options: {
  storeId: string;
  createdAt: Date;
  totalCents: number;
  productName: string;
}) {
  return createDailyClosingE2eOrder({
    storeId: options.storeId,
    createdAt: options.createdAt,
    status: "COMPLETED",
    source: "DIRECT",
    deliveryType: "PICKUP",
    paymentMethod: "PIX",
    subtotalCents: options.totalCents,
    deliveryFeeCents: 0,
    totalCents: options.totalCents,
    customerName: uniqueDailyClosingCustomer("Period"),
    items: [
      {
        productNameSnapshot: options.productName,
        quantity: 1,
        unitPriceCents: options.totalCents,
        totalCents: options.totalCents,
      },
    ],
  });
}

test.describe("admin daily closing period", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupDailyClosingE2eData();
  });

  test("inclusive start at 17:00:00.000", async ({ page }) => {
    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-period-start",
      name: "E2E DC Period Start",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-period-start@example.com",
      storeSlug: store.slug,
    });

    await createBoundaryOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "16:59:59.999"),
      totalCents: 1100,
      productName: "Period Fora Antes",
    });
    await createBoundaryOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "17:00:00.000"),
      totalCents: 2200,
      productName: "Period Dentro Inicio",
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    await expect(page.getByTestId("daily-closing-card-orders")).toContainText(
      "1",
    );
    await expect(page.getByTestId("daily-closing-card-total")).toContainText(
      "22,00",
    );
    await expect(page.getByTestId("daily-closing-products")).toContainText(
      "Period Dentro Inicio",
    );
    await expect(page.getByTestId("daily-closing-page")).not.toContainText(
      "Period Fora Antes",
    );
  });

  test("exclusive end at 01:00:00.000", async ({ page }) => {
    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-period-end",
      name: "E2E DC Period End",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-period-end@example.com",
      storeSlug: store.slug,
    });

    await createBoundaryOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc("2026-07-22", "00:59:59.999"),
      totalCents: 3300,
      productName: "Period Dentro Fim",
    });
    await createBoundaryOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc("2026-07-22", "01:00:00.000"),
      totalCents: 4400,
      productName: "Period Fora Depois",
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    await expect(page.getByTestId("daily-closing-card-orders")).toContainText(
      "1",
    );
    await expect(page.getByTestId("daily-closing-card-total")).toContainText(
      "33,00",
    );
    await expect(page.getByTestId("daily-closing-products")).toContainText(
      "Period Dentro Fim",
    );
    await expect(page.getByTestId("daily-closing-page")).not.toContainText(
      "Period Fora Depois",
    );
  });

  test("overnight orders belong to operational date 2026-07-21", async ({
    page,
  }) => {
    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-period-overnight",
      name: "E2E DC Period Overnight",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-period-overnight@example.com",
      storeSlug: store.slug,
    });

    await createBoundaryOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "23:50"),
      totalCents: 1500,
      productName: "Period Overnight Antes MeiaNoite",
    });
    await createBoundaryOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc("2026-07-22", "00:20"),
      totalCents: 2500,
      productName: "Period Overnight Depois MeiaNoite",
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    await expect(page.getByTestId("daily-closing-card-orders")).toContainText(
      "2",
    );
    await expect(page.getByTestId("daily-closing-card-total")).toContainText(
      "40,00",
    );
    await expect(page.getByTestId("daily-closing-products")).toContainText(
      "Period Overnight Antes MeiaNoite",
    );
    await expect(page.getByTestId("daily-closing-products")).toContainText(
      "Period Overnight Depois MeiaNoite",
    );
    await expect(page.getByTestId("daily-closing-summary-text")).toContainText(
      "Data operacional: 21/07/2026",
    );
    await expect(page.getByTestId("daily-closing-summary-text")).toContainText(
      "Período: 17:00–01:00",
    );
  });
});
