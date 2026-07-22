import { zonedWallTimeToUtc } from "@/features/admin/reports/daily-closing-period";
import { DAILY_CLOSING_TIMEZONE } from "@/features/admin/reports/daily-closing.types";

export const WEEKLY_FUNNEL_REPORT_TIMEZONE = DAILY_CLOSING_TIMEZONE;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_MON0: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export type WeeklyFunnelReportPeriod = {
  timezone: typeof WEEKLY_FUNNEL_REPORT_TIMEZONE;
  /** Inclusive calendar day label in America/Sao_Paulo (YYYY-MM-DD). */
  fromDate: string;
  /** Exclusive calendar day label in America/Sao_Paulo (YYYY-MM-DD). */
  toDate: string;
  /** Inclusive UTC instant. */
  fromAt: Date;
  /** Exclusive UTC instant. */
  toAt: Date;
};

export type ResolveWeeklyFunnelReportPeriodInput = {
  from?: string;
  to?: string;
  now?: Date;
};

function getZonedDateParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
}

function formatDateParts(parts: {
  year: number;
  month: number;
  day: number;
}): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  deltaDays: number,
): { year: number; month: number; day: number } {
  const utcNoon = Date.UTC(year, month - 1, day + deltaDays, 12, 0, 0);
  const d = new Date(utcNoon);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function parseDateParts(
  value: string,
): { year: number; month: number; day: number } | null {
  if (!DATE_RE.test(value)) {
    return null;
  }
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  const probe = zonedWallTimeToUtc(
    year,
    month,
    day,
    12,
    0,
    WEEKLY_FUNNEL_REPORT_TIMEZONE,
  );
  const parts = getZonedDateParts(probe, WEEKLY_FUNNEL_REPORT_TIMEZONE);
  if (parts.year !== year || parts.month !== month || parts.day !== day) {
    return null;
  }
  return { year, month, day };
}

/** Monday=0 … Sunday=6 for a calendar day in America/Sao_Paulo. */
export function spWeekdayMonday0(
  year: number,
  month: number,
  day: number,
): number {
  const instant = zonedWallTimeToUtc(
    year,
    month,
    day,
    12,
    0,
    WEEKLY_FUNNEL_REPORT_TIMEZONE,
  );
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: WEEKLY_FUNNEL_REPORT_TIMEZONE,
    weekday: "short",
  }).format(instant);
  const index = WEEKDAY_MON0[weekday];
  if (index == null) {
    throw new Error(`Unexpected weekday label: ${weekday}`);
  }
  return index;
}

function periodFromDateParts(
  from: { year: number; month: number; day: number },
  to: { year: number; month: number; day: number },
): WeeklyFunnelReportPeriod {
  const fromAt = zonedWallTimeToUtc(
    from.year,
    from.month,
    from.day,
    0,
    0,
    WEEKLY_FUNNEL_REPORT_TIMEZONE,
  );
  const toAt = zonedWallTimeToUtc(
    to.year,
    to.month,
    to.day,
    0,
    0,
    WEEKLY_FUNNEL_REPORT_TIMEZONE,
  );
  if (!(fromAt.getTime() < toAt.getTime())) {
    throw new Error("FROM must be strictly before TO (half-open window)");
  }
  return {
    timezone: WEEKLY_FUNNEL_REPORT_TIMEZONE,
    fromDate: formatDateParts(from),
    toDate: formatDateParts(to),
    fromAt,
    toAt,
  };
}

/**
 * Resolves a half-open report window in America/Sao_Paulo, converted to UTC.
 * - Explicit FROM/TO are calendar dates: FROM 00:00 inclusive, TO 00:00 exclusive.
 * - Default: previous completed Mon–Sun calendar week (TO = this week's Monday).
 */
export function resolveWeeklyFunnelReportPeriod(
  input: ResolveWeeklyFunnelReportPeriodInput = {},
): WeeklyFunnelReportPeriod {
  const fromRaw = input.from?.trim();
  const toRaw = input.to?.trim();

  if (Boolean(fromRaw) !== Boolean(toRaw)) {
    throw new Error("Provide both FROM and TO (YYYY-MM-DD), or neither");
  }

  if (fromRaw && toRaw) {
    const from = parseDateParts(fromRaw);
    const to = parseDateParts(toRaw);
    if (!from || !to) {
      throw new Error("FROM and TO must be valid YYYY-MM-DD calendar dates");
    }
    return periodFromDateParts(from, to);
  }

  const now = input.now ?? new Date();
  const today = getZonedDateParts(now, WEEKLY_FUNNEL_REPORT_TIMEZONE);
  const mondayOffset = spWeekdayMonday0(today.year, today.month, today.day);
  const thisMonday = addCalendarDays(
    today.year,
    today.month,
    today.day,
    -mondayOffset,
  );
  const prevMonday = addCalendarDays(
    thisMonday.year,
    thisMonday.month,
    thisMonday.day,
    -7,
  );
  return periodFromDateParts(prevMonday, thisMonday);
}
