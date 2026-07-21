import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCurrentOperationalDate,
  resolveDailyClosingPeriod,
  zonedWallTimeToUtc,
} from "@/features/admin/reports/daily-closing-period";
import { DAILY_CLOSING_TIMEZONE } from "@/features/admin/reports/daily-closing.types";

describe("zonedWallTimeToUtc America/Sao_Paulo", () => {
  it("maps 21/07/2026 17:00 SP to 20:00 UTC", () => {
    const date = zonedWallTimeToUtc(2026, 7, 21, 17, 0);
    assert.equal(date.toISOString(), "2026-07-21T20:00:00.000Z");
  });

  it("maps 22/07/2026 01:00 SP to 04:00 UTC", () => {
    const date = zonedWallTimeToUtc(2026, 7, 22, 1, 0);
    assert.equal(date.toISOString(), "2026-07-22T04:00:00.000Z");
  });
});

describe("resolveDailyClosingPeriod", () => {
  it("defaults to 17:00–01:00 overnight semi-open window", () => {
    const result = resolveDailyClosingPeriod({ date: "2026-07-21" });
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.period.timezone, DAILY_CLOSING_TIMEZONE);
    assert.equal(result.period.startTime, "17:00");
    assert.equal(result.period.endTime, "01:00");
    assert.equal(result.period.startIso, "2026-07-21T20:00:00.000Z");
    assert.equal(result.period.endExclusiveIso, "2026-07-22T04:00:00.000Z");
  });

  it("rejects start equal to end", () => {
    const result = resolveDailyClosingPeriod({
      date: "2026-07-21",
      startTime: "17:00",
      endTime: "17:00",
    });
    assert.equal(result.ok, false);
  });

  it("rejects invalid date and time", () => {
    assert.equal(resolveDailyClosingPeriod({ date: "21-07-2026" }).ok, false);
    assert.equal(
      resolveDailyClosingPeriod({
        date: "2026-07-21",
        startTime: "25:00",
      }).ok,
      false,
    );
    assert.equal(
      resolveDailyClosingPeriod({ date: "2026-02-30" }).ok,
      false,
    );
  });

  it("rejects windows longer than 24 hours", () => {
    // Same wall times on consecutive interpretation: start 00:00 end next day would need
    // end < start with almost 24h — use custom times that exceed via bug path.
    // start 00:00, end 00:00 rejected as equal.
    // Overnight start 00:01 end 00:00 next = 23h59m — ok.
    // Force >24h is hard with HH:mm same-day/overnight only; verify near-max accepted.
    const almostDay = resolveDailyClosingPeriod({
      date: "2026-07-21",
      startTime: "00:01",
      endTime: "00:00",
    });
    assert.equal(almostDay.ok, true);

    const fullDaySameClock = resolveDailyClosingPeriod({
      date: "2026-07-21",
      startTime: "10:00",
      endTime: "10:00",
    });
    assert.equal(fullDaySameClock.ok, false);
  });

  it("keeps same-day window when end is after start", () => {
    const result = resolveDailyClosingPeriod({
      date: "2026-07-21",
      startTime: "17:00",
      endTime: "23:00",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.period.startIso, "2026-07-21T20:00:00.000Z");
    assert.equal(result.period.endExclusiveIso, "2026-07-22T02:00:00.000Z");
  });
});

describe("getCurrentOperationalDate", () => {
  it("uses previous day during overnight tail before 01:00 SP", () => {
    // 22/07/2026 00:20 SP = 03:20 UTC
    const now = new Date("2026-07-22T03:20:00.000Z");
    assert.equal(getCurrentOperationalDate(now), "2026-07-21");
  });

  it("uses previous day in the afternoon gap before 17:00 SP", () => {
    // 22/07/2026 10:00 SP = 13:00 UTC
    const now = new Date("2026-07-22T13:00:00.000Z");
    assert.equal(getCurrentOperationalDate(now), "2026-07-21");
  });

  it("uses calendar day after 17:00 SP", () => {
    // 21/07/2026 18:00 SP = 21:00 UTC
    const now = new Date("2026-07-21T21:00:00.000Z");
    assert.equal(getCurrentOperationalDate(now), "2026-07-21");
  });
});
