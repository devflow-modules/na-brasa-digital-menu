import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveWeeklyFunnelReportPeriod,
  spWeekdayMonday0,
  WEEKLY_FUNNEL_REPORT_TIMEZONE,
} from "@/features/analytics/weekly-funnel-report-period";

describe("resolveWeeklyFunnelReportPeriod", () => {
  it("maps explicit FROM/TO calendar days in America/Sao_Paulo to half-open UTC", () => {
    const period = resolveWeeklyFunnelReportPeriod({
      from: "2026-07-14",
      to: "2026-07-21",
    });

    assert.equal(period.timezone, WEEKLY_FUNNEL_REPORT_TIMEZONE);
    assert.equal(period.fromDate, "2026-07-14");
    assert.equal(period.toDate, "2026-07-21");
    // SP is UTC-3 in July (no DST).
    assert.equal(period.fromAt.toISOString(), "2026-07-14T03:00:00.000Z");
    assert.equal(period.toAt.toISOString(), "2026-07-21T03:00:00.000Z");
  });

  it("defaults to the previous Mon–Sun week relative to America/Sao_Paulo", () => {
    // Wednesday 22 Jul 2026 15:00 UTC = 12:00 SP → current week Mon 20 Jul; previous Mon 13 Jul.
    const period = resolveWeeklyFunnelReportPeriod({
      now: new Date("2026-07-22T15:00:00.000Z"),
    });

    assert.equal(period.fromDate, "2026-07-13");
    assert.equal(period.toDate, "2026-07-20");
    assert.equal(period.fromAt.toISOString(), "2026-07-13T03:00:00.000Z");
    assert.equal(period.toAt.toISOString(), "2026-07-20T03:00:00.000Z");
  });

  it("rejects partial or inverted bounds", () => {
    assert.throws(() => resolveWeeklyFunnelReportPeriod({ from: "2026-07-14" }));
    assert.throws(() =>
      resolveWeeklyFunnelReportPeriod({ from: "2026-07-21", to: "2026-07-14" }),
    );
  });
});

describe("spWeekdayMonday0", () => {
  it("treats 2026-07-13 as Monday", () => {
    assert.equal(spWeekdayMonday0(2026, 7, 13), 0);
  });

  it("treats 2026-07-19 as Sunday", () => {
    assert.equal(spWeekdayMonday0(2026, 7, 19), 6);
  });
});
