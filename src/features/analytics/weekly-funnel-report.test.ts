import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWeeklyFunnelReportFromData,
  formatRatio,
  formatWeeklyFunnelReportText,
  safeRatio,
} from "@/features/analytics/weekly-funnel-report";
import { resolveWeeklyFunnelReportPeriod } from "@/features/analytics/weekly-funnel-report-period";

const period = resolveWeeklyFunnelReportPeriod({
  from: "2026-07-14",
  to: "2026-07-21",
});

describe("safeRatio", () => {
  it("returns null when denominator is zero instead of 0%", () => {
    assert.equal(safeRatio(5, 0), null);
    assert.equal(formatRatio(null), "n/a");
    assert.equal(safeRatio(3, 10), 0.3);
    assert.equal(formatRatio(0.3), "30.0%");
  });
});

describe("buildWeeklyFunnelReportFromData", () => {
  it("separates creation cohort status from lifecycle events occurred", () => {
    const report = buildWeeklyFunnelReportFromData({
      store: { id: "store_a", slug: "na-brasa", name: "Na Braza" },
      period,
      funnelCounts: [
        { name: "menu_viewed", _count: { _all: 10 } },
        { name: "product_added", _count: { _all: 4 } },
        { name: "checkout_started", _count: { _all: 2 } },
        { name: "order_created", _count: { _all: 5 } },
        { name: "whatsapp_handoff_started", _count: { _all: 3 } },
        { name: "order_completed", _count: { _all: 2 } },
      ],
      orderCreatedDirectCount: 3,
      cohortOrders: [
        {
          id: "o1",
          source: "DIRECT",
          status: "COMPLETED",
          totalCents: 5000,
        },
        {
          id: "o2",
          source: "COUNTER",
          status: "PENDING",
          totalCents: 3000,
        },
        {
          id: "o3",
          source: "DIRECT",
          status: "CANCELLED",
          totalCents: 2000,
        },
      ],
      cohortItems: [
        {
          orderId: "o1",
          productNameSnapshot: "Burger",
          quantity: 2,
          totalCents: 5000,
        },
        {
          orderId: "o2",
          productNameSnapshot: "Burger",
          quantity: 1,
          totalCents: 3000,
        },
        {
          orderId: "o3",
          productNameSnapshot: "Drink",
          quantity: 1,
          totalCents: 2000,
        },
      ],
      lifecycleEvents: [
        {
          name: "order_completed",
          orderId: "old_order",
          source: "DIRECT",
          occurredAt: new Date("2026-07-15T12:00:00.000Z"),
        },
        {
          name: "order_cancelled",
          orderId: "o3",
          source: "DIRECT",
          occurredAt: new Date("2026-07-16T12:00:00.000Z"),
        },
      ],
      createdEventsForTiming: [
        {
          orderId: "old_order",
          occurredAt: new Date("2026-07-10T12:00:00.000Z"),
        },
        {
          orderId: "o3",
          occurredAt: new Date("2026-07-16T11:00:00.000Z"),
        },
      ],
    });

    assert.equal(report.onlineFunnel.orderCreatedDirect, 3);
    assert.equal(report.onlineFunnel.ratios.productAddedPerMenuViewed, 0.4);
    assert.equal(report.onlineFunnel.ratios.checkoutStartedPerMenuViewed, 0.2);
    assert.equal(
      report.onlineFunnel.ratios.orderCreatedDirectPerCheckoutStarted,
      1.5,
    );
    assert.equal(
      report.onlineFunnel.ratios.whatsappHandoffPerOrderCreatedDirect,
      1,
    );
    assert.equal(report.creationCohort.total, 3);
    assert.equal(report.creationCohort.byStatus.COMPLETED, 1);
    assert.equal(report.creationCohort.byStatus.PENDING, 1);
    assert.equal(report.creationCohort.byStatus.CANCELLED, 1);
    assert.equal(report.creationCohort.open, 1);
    assert.equal(report.creationCohort.completed, 1);
    assert.equal(report.creationCohort.cancelled, 1);
    assert.equal(report.creationCohort.revenueCompletedCents, 5000);
    assert.equal(report.creationCohort.ticketAverageCents, 5000);

    // Lifecycle completions in-window include older order; not the same as cohort COMPLETED.
    assert.equal(report.lifecycleEventsOccurred.orderCompleted, 1);
    assert.equal(report.lifecycleEventsOccurred.orderCancelled, 1);

    assert.deepEqual(report.topProducts.operationalQuantity, [
      { productName: "Burger", quantity: 3 },
    ]);
    assert.deepEqual(report.topProducts.completedRevenue, [
      { productName: "Burger", quantity: 2, revenueCents: 5000 },
    ]);

    const text = formatWeeklyFunnelReportText(report);
    assert.match(text, /Creation cohort/);
    assert.match(text, /Lifecycle events occurred/);
    assert.match(text, /ratio product_added \/ menu_viewed: 40\.0%/);
    assert.match(text, /volume counts/);
    assert.match(text, /operational quantity/);
    assert.match(text, /completed revenue/);
    assert.doesNotMatch(text, /customerName|customerPhone|whatsappMessage/);
  });

  it("keeps null source as unclassified and does not infer DIRECT", () => {
    const report = buildWeeklyFunnelReportFromData({
      store: { id: "store_a", slug: "na-brasa", name: "Na Braza" },
      period,
      funnelCounts: [{ name: "menu_viewed", _count: { _all: 0 } }],
      orderCreatedDirectCount: 0,
      cohortOrders: [],
      cohortItems: [],
      lifecycleEvents: [
        {
          name: "order_confirmed",
          orderId: "a",
          source: null,
          occurredAt: new Date("2026-07-15T12:00:00.000Z"),
        },
        {
          name: "order_confirmed",
          orderId: "b",
          source: "COUNTER",
          occurredAt: new Date("2026-07-15T12:05:00.000Z"),
        },
      ],
      createdEventsForTiming: [],
    });

    assert.equal(report.lifecycleEventsOccurred.orderConfirmed, 2);
    assert.equal(
      report.lifecycleEventsOccurred.bySource.orderConfirmed.bySource.DIRECT,
      0,
    );
    assert.equal(
      report.lifecycleEventsOccurred.bySource.orderConfirmed.bySource.COUNTER,
      1,
    );
    assert.equal(
      report.lifecycleEventsOccurred.bySource.orderConfirmed.unclassified,
      1,
    );
    assert.equal(report.onlineFunnel.ratios.productAddedPerMenuViewed, null);

    const text = formatWeeklyFunnelReportText(report);
    assert.match(text, /unclassified=1/);
    assert.match(text, /ratio product_added \/ menu_viewed: n\/a/);
  });

  it("computes median timing for lifecycle events in the window", () => {
    const report = buildWeeklyFunnelReportFromData({
      store: { id: "store_a", slug: "na-brasa", name: "Na Braza" },
      period,
      funnelCounts: [],
      orderCreatedDirectCount: 0,
      cohortOrders: [],
      cohortItems: [],
      lifecycleEvents: [
        {
          name: "order_confirmed",
          orderId: "a",
          source: "DIRECT",
          occurredAt: new Date("2026-07-15T12:10:00.000Z"),
        },
        {
          name: "order_confirmed",
          orderId: "b",
          source: "COUNTER",
          occurredAt: new Date("2026-07-15T12:30:00.000Z"),
        },
      ],
      createdEventsForTiming: [
        {
          orderId: "a",
          occurredAt: new Date("2026-07-15T12:00:00.000Z"),
        },
        {
          orderId: "b",
          occurredAt: new Date("2026-07-15T12:00:00.000Z"),
        },
      ],
    });

    assert.equal(report.timing.createdToConfirmed.sampleSize, 2);
    assert.equal(report.timing.createdToConfirmed.medianMs, 20 * 60_000);
  });
});
