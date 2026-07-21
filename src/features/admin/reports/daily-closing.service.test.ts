import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDailyClosingPeriod } from "@/features/admin/reports/daily-closing-period";
import { aggregateDailyClosingReport } from "@/features/admin/reports/daily-closing.service";
import type { DailyClosingOrderInput } from "@/features/admin/reports/daily-closing.types";

function period() {
  const result = resolveDailyClosingPeriod({ date: "2026-07-21" });
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("period");
  }
  return result.period;
}

function baseOrder(
  overrides: Partial<DailyClosingOrderInput> & { code: string },
): DailyClosingOrderInput {
  return {
    status: "COMPLETED",
    source: "DIRECT",
    deliveryType: "PICKUP",
    paymentMethod: "PIX",
    subtotalCents: 2000,
    deliveryFeeCents: 0,
    totalCents: 2000,
    createdAt: new Date("2026-07-21T21:00:00.000Z"),
    items: [
      {
        productId: "p1",
        productNameSnapshot: "X-Burger",
        quantity: 1,
        unitPriceCents: 2000,
        totalCents: 2000,
        addons: [],
      },
    ],
    ...overrides,
  };
}

describe("aggregateDailyClosingReport", () => {
  it("aggregates line totalCents with quantity without re-multiplying", () => {
    const report = aggregateDailyClosingReport({
      storeName: "Na Braza",
      period: period(),
      orders: [
        baseOrder({
          code: "A1",
          subtotalCents: 6000,
          totalCents: 6000,
          items: [
            {
              productId: "p1",
              productNameSnapshot: "X-Burger",
              quantity: 3,
              unitPriceCents: 2000,
              totalCents: 6000,
              addons: [],
            },
          ],
        }),
      ],
    });

    assert.equal(report.summary.itemsSold, 3);
    assert.equal(report.products[0]?.quantity, 3);
    assert.equal(report.products[0]?.amountCents, 6000);
  });

  it("multiplies addon unit price by parent item quantity", () => {
    const report = aggregateDailyClosingReport({
      storeName: "Na Braza",
      period: period(),
      orders: [
        baseOrder({
          code: "A2",
          subtotalCents: 6400,
          totalCents: 6400,
          items: [
            {
              productId: "p1",
              productNameSnapshot: "Smash",
              quantity: 2,
              unitPriceCents: 3200,
              totalCents: 6400,
              addons: [
                {
                  addonId: "a1",
                  addonNameSnapshot: "Bacon",
                  addonPriceCents: 400,
                },
              ],
            },
          ],
        }),
      ],
    });

    assert.equal(report.addons[0]?.name, "Bacon");
    assert.equal(report.addons[0]?.quantity, 2);
    assert.equal(report.addons[0]?.amountCents, 800);
  });

  it("excludes CANCELLED and open orders from revenue totals", () => {
    const report = aggregateDailyClosingReport({
      storeName: "Na Braza",
      period: period(),
      orders: [
        baseOrder({ code: "C1", totalCents: 5000, subtotalCents: 5000 }),
        baseOrder({
          code: "X1",
          status: "CANCELLED",
          totalCents: 9000,
          subtotalCents: 9000,
        }),
        baseOrder({
          code: "O1",
          status: "PREPARING",
          totalCents: 3000,
          subtotalCents: 3000,
        }),
      ],
    });

    assert.equal(report.summary.completedOrders, 1);
    assert.equal(report.summary.cancelledOrders, 1);
    assert.equal(report.summary.openOrders, 1);
    assert.equal(report.summary.grossTotalCents, 5000);
    assert.equal(report.cancelledOrders[0]?.orderCode, "X1");
    assert.equal(report.cancelledOrders[0]?.totalCents, 9000);
    assert.equal(
      "customerName" in (report.cancelledOrders[0] as object),
      false,
    );
  });

  it("splits fulfillment channels and payment methods", () => {
    const report = aggregateDailyClosingReport({
      storeName: "Na Braza",
      period: period(),
      orders: [
        baseOrder({
          code: "D1",
          deliveryType: "DELIVERY",
          paymentMethod: "PIX",
          subtotalCents: 1000,
          deliveryFeeCents: 500,
          totalCents: 1500,
        }),
        baseOrder({
          code: "P1",
          deliveryType: "PICKUP",
          source: "DIRECT",
          paymentMethod: "CASH",
          totalCents: 2000,
          subtotalCents: 2000,
        }),
        baseOrder({
          code: "B1",
          source: "COUNTER",
          deliveryType: "PICKUP",
          paymentMethod: "DEBIT_CARD",
          totalCents: 3000,
          subtotalCents: 3000,
        }),
        baseOrder({
          code: "B2",
          source: "COUNTER",
          deliveryType: "PICKUP",
          paymentMethod: "CREDIT_CARD",
          totalCents: 1200,
          subtotalCents: 1200,
        }),
        baseOrder({
          code: "B3",
          source: "COUNTER",
          deliveryType: "PICKUP",
          paymentMethod: "CARD",
          totalCents: 800,
          subtotalCents: 800,
        }),
      ],
    });

    assert.equal(report.summary.grossTotalCents, 8500);
    assert.equal(report.summary.deliveryFeesCents, 500);
    assert.equal(report.summary.averageTicketCents, Math.round(8500 / 5));

    const byChannel = Object.fromEntries(
      report.fulfillment.map((row) => [row.channel, row]),
    );
    assert.equal(byChannel.DELIVERY?.orderCount, 1);
    assert.equal(byChannel.DELIVERY?.totalCents, 1500);
    assert.equal(byChannel.PICKUP?.orderCount, 1);
    assert.equal(byChannel.COUNTER?.orderCount, 3);

    const byPay = Object.fromEntries(
      report.payments.map((row) => [row.method, row]),
    );
    assert.equal(byPay.PIX?.amountCents, 1500);
    assert.equal(byPay.CASH?.amountCents, 2000);
    assert.equal(byPay.DEBIT_CARD?.amountCents, 3000);
    assert.equal(byPay.CREDIT_CARD?.amountCents, 1200);
    assert.equal(byPay.CARD?.amountCents, 800);
    assert.deepEqual(
      report.payments.map((row) => row.method),
      ["PIX", "CASH", "DEBIT_CARD", "CREDIT_CARD", "CARD"],
    );
  });

  it("buckets missing payment method as UNSET", () => {
    const report = aggregateDailyClosingReport({
      storeName: "Na Braza",
      period: period(),
      orders: [
        baseOrder({
          code: "U1",
          paymentMethod: null,
          totalCents: 1000,
          subtotalCents: 1000,
        }),
      ],
    });

    assert.equal(report.payments[0]?.method, "UNSET");
    assert.equal(report.payments[0]?.amountCents, 1000);
  });

  it("returns zero averages and notes for empty completed set", () => {
    const report = aggregateDailyClosingReport({
      storeName: "Na Braza",
      period: period(),
      orders: [
        baseOrder({ code: "O1", status: "PENDING", totalCents: 1000 }),
      ],
    });

    assert.equal(report.summary.completedOrders, 0);
    assert.equal(report.summary.averageTicketCents, 0);
    assert.equal(report.summary.openOrders, 1);
    assert.ok(
      report.notes.some((note) => note.includes("1 pedido ainda aberto")),
    );
  });
});
