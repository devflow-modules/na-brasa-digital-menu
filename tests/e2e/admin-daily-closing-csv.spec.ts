import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
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

function normalizeCsv(content: string): string {
  return content.replace(/^\uFEFF/, "").replace(/\u00a0/g, " ");
}

test.describe("admin daily closing CSV export", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupDailyClosingE2eData();
  });

  test("downloads CSV for current filter with sections and without PII", async ({
    page,
  }) => {
    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-csv",
      name: "E2E DC Csv",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-csv-owner@example.com",
      storeSlug: store.slug,
    });

    const secretCustomer = "E2E_SECRET_CSV_CUSTOMER";
    const secretPhone = "E2E_SECRET_CSV_PHONE";
    const secretAddress = "E2E_SECRET_CSV_ADDRESS";
    const secretNote = "E2E_SECRET_CSV_NOTE";

    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:00"),
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "DELIVERY",
      paymentMethod: "PIX",
      subtotalCents: 4000,
      deliveryFeeCents: 600,
      totalCents: 4600,
      customerName: `${secretCustomer} ${uniqueDailyClosingCustomer("CsvA")}`,
      customerPhone: secretPhone,
      deliveryAddress: secretAddress,
      notes: secretNote,
      items: [
        {
          productNameSnapshot: "Csv Product A",
          quantity: 2,
          unitPriceCents: 2000,
          totalCents: 4000,
          addons: [
            {
              addonNameSnapshot: "Csv Addon A",
              addonPriceCents: 150,
            },
          ],
        },
      ],
    });

    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:20"),
      status: "COMPLETED",
      source: "COUNTER",
      deliveryType: "PICKUP",
      paymentMethod: "CASH",
      subtotalCents: 2500,
      deliveryFeeCents: 0,
      totalCents: 2500,
      customerName: uniqueDailyClosingCustomer("CsvCounter"),
      items: [
        {
          productNameSnapshot: "Csv Counter Product",
          quantity: 1,
          unitPriceCents: 2500,
          totalCents: 2500,
        },
      ],
    });

    const cancelled = await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:40"),
      status: "CANCELLED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "CARD",
      subtotalCents: 9999,
      deliveryFeeCents: 0,
      totalCents: 9999,
      customerName: `${secretCustomer} ${uniqueDailyClosingCustomer("CsvCancel")}`,
      customerPhone: secretPhone,
      notes: secretNote,
      items: [
        {
          productNameSnapshot: "Csv Cancelled Product",
          quantity: 1,
          unitPriceCents: 9999,
          totalCents: 9999,
        },
      ],
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);
    await expect(page.getByTestId("daily-closing-download-csv")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("daily-closing-download-csv").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(
      "fechamento-operacional-e2e-dc-csv-2026-07-21.csv",
    );

    const path = await download.path();
    expect(path).toBeTruthy();
    const raw = readFileSync(path!, "utf8");
    expect(raw.startsWith("\uFEFF")).toBeTruthy();
    const csv = normalizeCsv(raw);

    expect(csv).toContain("FECHAMENTO OPERACIONAL");
    expect(csv).toContain("RESUMO");
    expect(csv).toContain("PAGAMENTOS");
    expect(csv).toContain("MODALIDADES");
    expect(csv).toContain("PRODUTOS");
    expect(csv).toContain("ADICIONAIS");
    expect(csv).toContain("CANCELADOS");
    expect(csv).toContain("Data operacional;21/07/2026");
    expect(csv).toContain("Período;17:00–01:00");
    expect(csv).toContain("Total vendido em pedidos concluídos;;71,00");
    expect(csv).toContain("Taxas de entrega;;6,00");
    expect(csv).toContain("Csv Product A;2;40,00");
    expect(csv).toContain("Csv Addon A;2;3,00");
    expect(csv).toContain("Balcão");
    expect(csv).toContain(cancelled.code);
    expect(csv).not.toContain(secretCustomer);
    expect(csv).not.toContain(secretPhone);
    expect(csv).not.toContain(secretAddress);
    expect(csv).not.toContain(secretNote);
  });

  test("second download reflects only the new filter window", async ({
    page,
  }) => {
    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-csv-filter",
      name: "E2E DC Csv Filter",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-csv-filter-owner@example.com",
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
      customerName: uniqueDailyClosingCustomer("CsvFilterA"),
      items: [
        {
          productNameSnapshot: "Csv Filter Product A",
          quantity: 1,
          unitPriceCents: 1800,
          totalCents: 1800,
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
      subtotalCents: 2700,
      deliveryFeeCents: 0,
      totalCents: 2700,
      customerName: uniqueDailyClosingCustomer("CsvFilterB"),
      items: [
        {
          productNameSnapshot: "Csv Filter Product B",
          quantity: 1,
          unitPriceCents: 2700,
          totalCents: 2700,
        },
      ],
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    const downloadAPromise = page.waitForEvent("download");
    await page.getByTestId("daily-closing-download-csv").click();
    const downloadA = await downloadAPromise;
    const csvA = normalizeCsv(readFileSync((await downloadA.path())!, "utf8"));
    expect(csvA).toContain("Data operacional;21/07/2026");
    expect(csvA).toContain("Csv Filter Product A");
    expect(csvA).not.toContain("Csv Filter Product B");

    await applyDailyClosingFilters(page, {
      date: "2026-07-22",
      start: "17:00",
      end: "01:00",
    });
    await expect(page.getByTestId("daily-closing-products")).toContainText(
      "Csv Filter Product B",
    );

    const downloadBPromise = page.waitForEvent("download");
    await page.getByTestId("daily-closing-download-csv").click();
    const downloadB = await downloadBPromise;
    expect(downloadB.suggestedFilename()).toBe(
      "fechamento-operacional-e2e-dc-csv-filter-2026-07-22.csv",
    );
    const csvB = normalizeCsv(readFileSync((await downloadB.path())!, "utf8"));
    expect(csvB).toContain("Data operacional;22/07/2026");
    expect(csvB).toContain("Csv Filter Product B");
    expect(csvB).not.toContain("Csv Filter Product A");
    expect(csvB).not.toContain("18,00");
  });

  test("store A CSV never includes store B data", async ({ page }) => {
    const storeA = await createDailyClosingE2eStore({
      slug: "e2e-dc-csv-tenant-a",
      name: "E2E DC Csv Tenant A",
    });
    const storeB = await createDailyClosingE2eStore({
      slug: "e2e-dc-csv-tenant-b",
      name: "E2E DC Csv Tenant B",
    });

    const ownerA = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-csv-tenant-a-owner@example.com",
      storeSlug: storeA.slug,
    });

    const createdAt = dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "19:00");

    await createDailyClosingE2eOrder({
      storeId: storeA.id,
      createdAt,
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 3100,
      deliveryFeeCents: 0,
      totalCents: 3100,
      customerName: uniqueDailyClosingCustomer("CsvTenantA"),
      items: [
        {
          productNameSnapshot: "Csv Tenant A Product",
          quantity: 1,
          unitPriceCents: 3100,
          totalCents: 3100,
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
      subtotalCents: 8800,
      deliveryFeeCents: 0,
      totalCents: 8800,
      customerName: uniqueDailyClosingCustomer("CsvTenantB"),
      customerPhone: "13972223333",
      items: [
        {
          productNameSnapshot: "Csv Tenant B Secret Product",
          quantity: 1,
          unitPriceCents: 8800,
          totalCents: 8800,
        },
      ],
    });

    await loginAsUser(page, ownerA);
    await openDefaultDailyClosingWindow(page);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("daily-closing-download-csv").click();
    const download = await downloadPromise;
    const csv = normalizeCsv(readFileSync((await download.path())!, "utf8"));

    expect(csv).toContain("Csv Tenant A Product");
    expect(csv).toContain("31,00");
    expect(csv).not.toContain(orderB.code);
    expect(csv).not.toContain("Csv Tenant B Secret Product");
    expect(csv).not.toContain("88,00");
    expect(csv).not.toContain(orderB.order.customerName);
    expect(csv).not.toContain("13972223333");
  });
});
