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

const SECRET_CUSTOMER = "E2E_SECRET_CUSTOMER";
const SECRET_PHONE = "E2E_SECRET_PHONE";
const SECRET_ADDRESS = "E2E_SECRET_ADDRESS";
const SECRET_NOTE = "E2E_SECRET_NOTE";

test.describe("admin daily closing privacy", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupDailyClosingE2eData();
  });

  test("PII never appears on page, summary text or clipboard", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-privacy",
      name: "E2E DC Privacy",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-privacy-owner@example.com",
      storeSlug: store.slug,
    });

    const completed = await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "19:00"),
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "DELIVERY",
      paymentMethod: "PIX",
      subtotalCents: 2500,
      deliveryFeeCents: 500,
      totalCents: 3000,
      customerName: `${SECRET_CUSTOMER} ${uniqueDailyClosingCustomer("Done")}`,
      customerPhone: SECRET_PHONE,
      deliveryAddress: SECRET_ADDRESS,
      notes: SECRET_NOTE,
      items: [
        {
          productNameSnapshot: "Privacy Completed Product",
          quantity: 1,
          unitPriceCents: 2500,
          totalCents: 2500,
        },
      ],
    });

    const cancelled = await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "19:15"),
      status: "CANCELLED",
      source: "DIRECT",
      deliveryType: "DELIVERY",
      paymentMethod: "CASH",
      subtotalCents: 1800,
      deliveryFeeCents: 500,
      totalCents: 2300,
      customerName: `${SECRET_CUSTOMER} ${uniqueDailyClosingCustomer("Cancel")}`,
      customerPhone: SECRET_PHONE,
      deliveryAddress: SECRET_ADDRESS,
      notes: SECRET_NOTE,
      items: [
        {
          productNameSnapshot: "Privacy Cancelled Product",
          quantity: 1,
          unitPriceCents: 1800,
          totalCents: 1800,
        },
      ],
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    const pageRoot = page.getByTestId("daily-closing-page");
    await expect(pageRoot).toBeVisible();
    await expect(pageRoot).toContainText("Privacy Completed Product");
    await expect(pageRoot).toContainText(cancelled.code);
    await expect(pageRoot).not.toContainText(SECRET_CUSTOMER);
    await expect(pageRoot).not.toContainText(SECRET_PHONE);
    await expect(pageRoot).not.toContainText(SECRET_ADDRESS);
    await expect(pageRoot).not.toContainText(SECRET_NOTE);
    await expect(pageRoot).not.toContainText(completed.order.customerName);
    await expect(pageRoot).not.toContainText(cancelled.order.customerName);

    const summary = await page
      .getByTestId("daily-closing-summary-text")
      .innerText();
    expect(summary).not.toContain(SECRET_CUSTOMER);
    expect(summary).not.toContain(SECRET_PHONE);
    expect(summary).not.toContain(SECRET_ADDRESS);
    expect(summary).not.toContain(SECRET_NOTE);

    await page.getByTestId("daily-closing-copy").click();
    await expect(page.getByTestId("daily-closing-copy-success")).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("Privacy Completed Product");
    expect(clipboard).toContain(cancelled.code);
    expect(clipboard).not.toContain(SECRET_CUSTOMER);
    expect(clipboard).not.toContain(SECRET_PHONE);
    expect(clipboard).not.toContain(SECRET_ADDRESS);
    expect(clipboard).not.toContain(SECRET_NOTE);
  });
});
