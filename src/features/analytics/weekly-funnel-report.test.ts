import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWeeklyFunnelReportFromData,
  formatWeeklyFunnelReportText,
} from "@/features/analytics/weekly-funnel-report";
import { resolveWeeklyFunnelReportPeriod } from "@/features/analytics/weekly-funnel-report-period";

const period = resolveWeeklyFunnelReportPeriod({
  from: "2026-07-14",
  to: "2026-07-21",
});

describe("buildWeeklyFunnelReportFromData", () => {
  it("separates creation cohort status from lifecycle events occurred", () => {
    const report = buildWeeklyFunnelReportFromData({
      store: { id: "store_a", slug: "na-brasa", name: "Na Braza" },
      period,
      funnelCounts: [
        { name: "menu_viewed", _count: { _all: 10 } },
        { name: "order_created", _count: { _all: 5 } },
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
    assert.match(text, /operational quantity/);
    assert.match(text, /completed revenue/);
    assert.doesNotMatch(text, /customerName|customerPhone|whatsappMessage/);
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
