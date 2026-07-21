import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import {
  cleanupDailyClosingE2eData,
  createDailyClosingE2eOrder,
  createDailyClosingE2eStore,
  dailyClosingWallTimeToUtc,
  DAILY_CLOSING_E2E_DATE,
  ensureSnapshotProduct,
  renameProductForSnapshotTest,
  uniqueDailyClosingCustomer,
} from "./helpers/daily-closing-fixtures";
import { openDefaultDailyClosingWindow } from "./helpers/daily-closing-ui";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";

test.describe("admin daily closing aggregation", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupDailyClosingE2eData();
  });

  test("channels, payments, status, fees, qty, snapshot, addons and invariants", async ({
    page,
  }) => {
    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-aggregation",
      name: "E2E DC Aggregation",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-aggregation-owner@example.com",
      storeSlug: store.slug,
    });

    const t0 = dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:00");
    const t1 = dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:10");
    const t2 = dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:20");
    const t3 = dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:30");
    const t4 = dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:40");
    const t5 = dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "18:50");
    const t6 = dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "19:00");

    const snapshotProduct = await ensureSnapshotProduct({
      storeId: store.id,
      name: "Hambúrguer Snapshot E2E",
    });

    // DELIVERY + DIRECT + PIX + fee
    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: t0,
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "DELIVERY",
      paymentMethod: "PIX",
      subtotalCents: 3000,
      deliveryFeeCents: 600,
      totalCents: 3600,
      customerName: uniqueDailyClosingCustomer("Agg Delivery"),
      deliveryAddress: "Rua Agg Entrega, 10",
      items: [
        {
          productNameSnapshot: "Agg Delivery Burger",
          quantity: 1,
          unitPriceCents: 3000,
          totalCents: 3000,
        },
      ],
    });

    // PICKUP + DIRECT + CASH
    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: t1,
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "CASH",
      subtotalCents: 2000,
      deliveryFeeCents: 0,
      totalCents: 2000,
      customerName: uniqueDailyClosingCustomer("Agg Pickup"),
      items: [
        {
          productNameSnapshot: "Agg Pickup Item",
          quantity: 1,
          unitPriceCents: 2000,
          totalCents: 2000,
        },
      ],
    });

    // COUNTER + CARD (must not count as retirada)
    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: t2,
      status: "COMPLETED",
      source: "COUNTER",
      deliveryType: "PICKUP",
      paymentMethod: "CARD",
      subtotalCents: 1500,
      deliveryFeeCents: 0,
      totalCents: 1500,
      customerName: uniqueDailyClosingCustomer("Agg Counter"),
      items: [
        {
          productNameSnapshot: "Agg Counter Item",
          quantity: 1,
          unitPriceCents: 1500,
          totalCents: 1500,
        },
      ],
    });

    // COMPLETED + UNSET payment + qty 3 + addon × 3 + snapshot product
    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: t3,
      status: "COMPLETED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: null,
      subtotalCents: 6600,
      deliveryFeeCents: 0,
      totalCents: 6600,
      customerName: uniqueDailyClosingCustomer("Agg Qty Addon"),
      items: [
        {
          productId: snapshotProduct.id,
          productNameSnapshot: "Hambúrguer Snapshot E2E",
          quantity: 3,
          unitPriceCents: 2200,
          totalCents: 6600,
          addons: [
            {
              addonNameSnapshot: "Agg Bacon Extra",
              addonPriceCents: 200,
            },
          ],
        },
      ],
    });

    await renameProductForSnapshotTest({
      productId: snapshotProduct.id,
      newName: "Hambúrguer Snapshot Renomeado Agora",
    });

    const cancelled = await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: t4,
      status: "CANCELLED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 9999,
      deliveryFeeCents: 0,
      totalCents: 9999,
      customerName: uniqueDailyClosingCustomer("Agg Cancelled"),
      customerPhone: "13971112222",
      notes: "Nota cancelada secreta",
      items: [
        {
          productNameSnapshot: "Agg Cancelled Item",
          quantity: 1,
          unitPriceCents: 9999,
          totalCents: 9999,
        },
      ],
    });

    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: t5,
      status: "PENDING",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 7777,
      deliveryFeeCents: 0,
      totalCents: 7777,
      customerName: uniqueDailyClosingCustomer("Agg Open"),
      items: [
        {
          productNameSnapshot: "Agg Open Item",
          quantity: 1,
          unitPriceCents: 7777,
          totalCents: 7777,
        },
      ],
    });

    // Extra completed for second open? we have 1 open. Also PREPARING
    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: t6,
      status: "PREPARING",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "CASH",
      subtotalCents: 8888,
      deliveryFeeCents: 0,
      totalCents: 8888,
      customerName: uniqueDailyClosingCustomer("Agg Preparing"),
      items: [
        {
          productNameSnapshot: "Agg Preparing Item",
          quantity: 1,
          unitPriceCents: 8888,
          totalCents: 8888,
        },
      ],
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    // Completed: delivery 3600 + pickup 2000 + counter 1500 + qty3 6600 = 13700
    // Retirada = pickup DIRECT only (2000 + 6600) = 8600 / 2 pedidos
    await expect(page.getByTestId("daily-closing-card-orders")).toContainText(
      "4",
    );
    await expect(page.getByTestId("daily-closing-card-cancelled")).toContainText(
      "1",
    );
    await expect(page.getByTestId("daily-closing-card-total")).toContainText(
      "137,00",
    );
    await expect(page.getByTestId("daily-closing-card-fees")).toContainText(
      "6,00",
    );
    await expect(page.getByTestId("daily-closing-card-items")).toContainText(
      "6",
    );

    const fulfillment = page.getByTestId("daily-closing-fulfillment");
    await expect(fulfillment).toContainText("Entrega");
    await expect(fulfillment).toContainText("1 pedidos — R$ 36,00");
    await expect(fulfillment).toContainText("Retirada");
    await expect(fulfillment).toContainText("2 pedidos — R$ 86,00");
    await expect(fulfillment).toContainText("Balcão");
    await expect(fulfillment).toContainText("1 pedidos — R$ 15,00");
    const fulfillmentText = await fulfillment.innerText();
    expect(fulfillmentText.match(/Retirada/g)?.length ?? 0).toBe(1);
    expect(fulfillmentText.match(/Balcão/g)?.length ?? 0).toBe(1);

    const payments = page.getByTestId("daily-closing-payments");
    await expect(payments).toContainText("Pix");
    await expect(payments).toContainText("R$ 36,00 — 1 pedidos");
    await expect(payments).toContainText("Dinheiro");
    await expect(payments).toContainText("R$ 20,00 — 1 pedidos");
    await expect(payments).toContainText("Cartão");
    await expect(payments).toContainText("R$ 15,00 — 1 pedidos");
    await expect(payments).toContainText("Não informado");
    await expect(payments).toContainText("R$ 66,00 — 1 pedidos");

    await expect(page.getByTestId("daily-closing-open-alert")).toContainText(
      "2 pedidos ainda abertos",
    );

    const cancelledSection = page.getByTestId("daily-closing-cancelled");
    await expect(cancelledSection).toContainText(cancelled.code);
    await expect(cancelledSection).toContainText("99,99");
    await expect(cancelledSection).not.toContainText(
      cancelled.order.customerName,
    );
    await expect(cancelledSection).not.toContainText("13971112222");
    await expect(cancelledSection).not.toContainText("Nota cancelada secreta");

    const products = page.getByTestId("daily-closing-products");
    await expect(products).toContainText("Hambúrguer Snapshot E2E");
    await expect(products).not.toContainText(
      "Hambúrguer Snapshot Renomeado Agora",
    );
    await expect(products).toContainText("3 — R$ 66,00");
    await expect(products).not.toContainText("Agg Cancelled Item");
    await expect(products).not.toContainText("Agg Open Item");
    await expect(products).not.toContainText("Agg Preparing Item");

    const addons = page.getByTestId("daily-closing-addons");
    await expect(addons).toContainText("Agg Bacon Extra");
    await expect(addons).toContainText("3 — R$ 6,00");

    await expect(page.getByTestId("daily-closing-page")).toContainText(
      "131,00",
    );

    const summary = (
      await page.getByTestId("daily-closing-summary-text").innerText()
    ).replace(/\u00a0/g, " ");
    expect(summary).toContain("TOTAL VENDIDO EM PEDIDOS CONCLUÍDOS");
    expect(summary).toContain("R$ 131,00");
    expect(summary).toContain("R$ 6,00");
    expect(summary).toContain("R$ 137,00");
    expect(summary).toContain("Entrega: 1 pedido — R$ 36,00");
    expect(summary).toContain("Retirada: 2 pedidos — R$ 86,00");
    expect(summary).toContain("Balcão: 1 pedido — R$ 15,00");
    expect(summary).toMatch(/\*Total vendido: R\$\s*137,00\*/);

    const paymentsBlock =
      summary.split("FORMAS DE PAGAMENTO")[1]?.split("MODALIDADES")[0] ?? "";
    expect(paymentsBlock).not.toContain("99,99");
    expect(paymentsBlock).not.toContain("77,77");
    expect(paymentsBlock).not.toContain("88,88");

    const productsBlock =
      summary.split("PRODUTOS")[1]?.split("CANCELADOS")[0] ?? "";
    expect(productsBlock).not.toContain("Agg Cancelled Item");
    expect(productsBlock).not.toContain("Agg Open Item");
    expect(productsBlock).not.toContain("Agg Preparing Item");

    expect(summary).toContain("CANCELADOS");
    expect(summary).toContain("99,99");
  });

  test("zero completed still shows cancelled and open alert", async ({
    page,
  }) => {
    const store = await createDailyClosingE2eStore({
      slug: "e2e-dc-agg-zero",
      name: "E2E DC Agg Zero",
    });
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-dc-agg-zero-owner@example.com",
      storeSlug: store.slug,
    });

    const createdAt = dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "20:00");

    const cancelled = await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt,
      status: "CANCELLED",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 5000,
      deliveryFeeCents: 0,
      totalCents: 5000,
      customerName: uniqueDailyClosingCustomer("Zero Cancel"),
      items: [
        {
          productNameSnapshot: "Zero Cancel Product",
          quantity: 1,
          unitPriceCents: 5000,
          totalCents: 5000,
        },
      ],
    });

    await createDailyClosingE2eOrder({
      storeId: store.id,
      createdAt: dailyClosingWallTimeToUtc(DAILY_CLOSING_E2E_DATE, "20:10"),
      status: "PENDING",
      source: "DIRECT",
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      subtotalCents: 4000,
      deliveryFeeCents: 0,
      totalCents: 4000,
      customerName: uniqueDailyClosingCustomer("Zero Open"),
      items: [
        {
          productNameSnapshot: "Zero Open Product",
          quantity: 1,
          unitPriceCents: 4000,
          totalCents: 4000,
        },
      ],
    });

    await loginAsUser(page, owner);
    await openDefaultDailyClosingWindow(page);

    await expect(page.getByTestId("daily-closing-empty")).toBeVisible();
    await expect(page.getByTestId("daily-closing-card-orders")).toContainText(
      "0",
    );
    await expect(page.getByTestId("daily-closing-card-total")).toContainText(
      "0,00",
    );
    await expect(page.getByTestId("daily-closing-card-cancelled")).toContainText(
      "1",
    );
    await expect(page.getByTestId("daily-closing-cancelled")).toContainText(
      cancelled.code,
    );
    await expect(page.getByTestId("daily-closing-open-alert")).toContainText(
      "1 pedido ainda aberto",
    );
    await expect(page.getByTestId("daily-closing-summary-text")).toContainText(
      "TOTAL VENDIDO EM PEDIDOS CONCLUÍDOS",
    );
    await expect(page.getByTestId("daily-closing-summary-text")).not.toContainText(
      "40,00",
    );
  });
});
