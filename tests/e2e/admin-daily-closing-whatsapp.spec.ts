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

function decodeWhatsappHref(href: string | null): string {
  expect(href).toBeTruthy();
  expect(href!).toMatch(/^https:\/\/wa\.me\/\?text=/);
  expect(href!).not.toMatch(/wa\.me\/\d+/);
  const encoded = href!.slice("https://wa.me/?text=".length);
  return decodeURIComponent(encoded);
}

/** Clipboard on Windows may normalize LF → CRLF; compare semantic content. */
function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

test.describe("admin daily closing WhatsApp share", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupDailyClosingE2eData();
  });

  test("open WhatsApp link encodes required sections without PII", async ({
    page,
  }) => {
    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-wa",
      name: "E2E DC Wa",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-wa-owner@example.com",
      storeSlug: store.slug,
    });

    const secretCustomer = "E2E_SECRET_WA_CUSTOMER";
    const secretPhone = "E2E_SECRET_WA_PHONE";
    const secretAddress = "E2E_SECRET_WA_ADDRESS";
    const secretNote = "E2E_SECRET_WA_NOTE";

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
      customerName: `${secretCustomer} ${uniqueDailyClosingCustomer("WaA")}`,
      customerPhone: secretPhone,
      deliveryAddress: secretAddress,
      notes: secretNote,
      items: [
        {
          productNameSnapshot: "Wa Product A",
          quantity: 2,
          unitPriceCents: 2000,
          totalCents: 4000,
          addons: [
            {
              addonNameSnapshot: "Wa Addon A",
              addonPriceCents: 150,
            },
          ],
        },
      ],
    });

    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "19:00"),
      status: "PENDING",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "CASH",
      subtotalCents: 9100,
      deliveryFeeCents: 0,
      totalCents: 9100,
      customerName: uniqueDailyClosingCustomer("WaOpen"),
      items: [
        {
          productNameSnapshot: "Wa Open Product",
          quantity: 1,
          unitPriceCents: 9100,
          totalCents: 9100,
        },
      ],
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    const link = page.getByTestId("daily-closing-open-whatsapp");
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");

    const text = decodeWhatsappHref(await link.getAttribute("href"));
    expect(text).toContain("FECHAMENTO OPERACIONAL");
    expect(text).toContain("*Data operacional:* 21/07/2026");
    expect(text).toContain("*Período:* 17:00–01:00");
    expect(text).toContain("TOTAL VENDIDO EM PEDIDOS CONCLUÍDOS");
    expect(text).toContain("FORMAS DE PAGAMENTO");
    expect(text).toContain("MODALIDADES");
    expect(text).toContain("PRODUTOS");
    expect(text).toContain("ADICIONAIS");
    expect(text).toContain("Wa Product A");
    expect(text).toContain("Wa Addon A");
    expect(text).toContain("ainda aberto");
    expect(text).not.toContain(secretCustomer);
    expect(text).not.toContain(secretPhone);
    expect(text).not.toContain(secretAddress);
    expect(text).not.toContain(secretNote);
    expect(text).not.toContain("91,00");
    expect(text).not.toContain("Wa Open Product");
  });

  test("WhatsApp link reflects only the current filter window", async ({
    page,
  }) => {
    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-wa-filter",
      name: "E2E DC Wa Filter",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-wa-filter-owner@example.com",
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
      customerName: uniqueDailyClosingCustomer("WaFilterA"),
      items: [
        {
          productNameSnapshot: "Wa Filter Product A",
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
      customerName: uniqueDailyClosingCustomer("WaFilterB"),
      items: [
        {
          productNameSnapshot: "Wa Filter Product B",
          quantity: 1,
          unitPriceCents: 5400,
          totalCents: 5400,
        },
      ],
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    const textA = decodeWhatsappHref(
      await page.getByTestId("daily-closing-open-whatsapp").getAttribute("href"),
    );
    expect(textA).toContain("*Data operacional:* 21/07/2026");
    expect(textA).toContain("Wa Filter Product A");
    expect(textA).not.toContain("Wa Filter Product B");

    await applyDailyClosingFilters(page, {
      date: "2026-07-22",
      start: "17:00",
      end: "01:00",
    });
    await expect(page.getByTestId("daily-closing-products")).toContainText(
      "Wa Filter Product B",
    );

    const textB = decodeWhatsappHref(
      await page.getByTestId("daily-closing-open-whatsapp").getAttribute("href"),
    );
    expect(textB).toContain("*Data operacional:* 22/07/2026");
    expect(textB).toContain("Wa Filter Product B");
    expect(textB).not.toContain("Wa Filter Product A");
    expect(textB).not.toContain("21,00");
  });

  test("clipboard text matches decoded WhatsApp URL text", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-wa-sync",
      name: "E2E DC Wa Sync",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-wa-sync-owner@example.com",
      storeSlug: store.slug,
    });

    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:00"),
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 3300,
      deliveryFeeCents: 0,
      totalCents: 3300,
      customerName: uniqueDailyClosingCustomer("WaSync"),
      items: [
        {
          productNameSnapshot: "Wa Sync Product",
          quantity: 1,
          unitPriceCents: 3300,
          totalCents: 3300,
        },
      ],
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    const decoded = decodeWhatsappHref(
      await page.getByTestId("daily-closing-open-whatsapp").getAttribute("href"),
    );

    await page.getByTestId("daily-closing-copy").click();
    await expect(page.getByTestId("daily-closing-copy-success")).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(normalizeNewlines(clipboard)).toBe(normalizeNewlines(decoded));
  });

  test("store A WhatsApp text never includes store B data", async ({
    page,
  }) => {
    const storeA = await createDailyClosingE2eStore({
      slug: "e2e-dc-wa-a",
      name: "E2E DC Wa A",
    });
    const storeB = await createDailyClosingE2eStore({
      slug: "e2e-dc-wa-b",
      name: "E2E DC Wa B",
    });
    const ownerA = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-wa-a-owner@example.com",
      storeSlug: storeA.slug,
    });

    await createDailyClosingE2eOrder({
      storeId: storeA.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:00"),
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 2500,
      deliveryFeeCents: 0,
      totalCents: 2500,
      customerName: uniqueDailyClosingCustomer("WaTenantA"),
      items: [
        {
          productNameSnapshot: "Wa Tenant Product A",
          quantity: 1,
          unitPriceCents: 2500,
          totalCents: 2500,
        },
      ],
    });

    const orderB = await createDailyClosingE2eOrder({
      storeId: storeB.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:30"),
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "CASH",
      subtotalCents: 7777,
      deliveryFeeCents: 0,
      totalCents: 7777,
      customerName: "E2E_SECRET_WA_TENANT_B_CUSTOMER",
      customerPhone: "E2E_SECRET_WA_TENANT_B_PHONE",
      items: [
        {
          productNameSnapshot: "Wa Tenant Product B Unique",
          quantity: 1,
          unitPriceCents: 7777,
          totalCents: 7777,
        },
      ],
    });

    await loginAsUser(page, ownerA);
    await openDefaultDailyClosingWindow(page);

    const text = decodeWhatsappHref(
      await page.getByTestId("daily-closing-open-whatsapp").getAttribute("href"),
    );
    expect(text).toContain("Wa Tenant Product A");
    expect(text).not.toContain("Wa Tenant Product B Unique");
    expect(text).not.toContain(orderB.code);
    expect(text).not.toContain("77,77");
    expect(text).not.toContain("E2E_SECRET_WA_TENANT_B_CUSTOMER");
    expect(text).not.toContain("E2E_SECRET_WA_TENANT_B_PHONE");
  });
});
