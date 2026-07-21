import {
  DAILY_CLOSING_TIMEZONE,
  DEFAULT_DAILY_CLOSING_END,
  DEFAULT_DAILY_CLOSING_START,
  type DailyClosingPeriod,
} from "@/features/admin/reports/daily-closing.types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MS_PER_HOUR = 60 * 60 * 1000;
const MAX_WINDOW_MS = 24 * MS_PER_HOUR;

export type DailyClosingPeriodInput = {
  date: string;
  startTime?: string;
  endTime?: string;
};

export type DailyClosingPeriodResult =
  | { ok: true; period: DailyClosingPeriod }
  | { ok: false; message: string };

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
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
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Offset such that localWallAsUtcNumber - instant = offset. */
function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = getZonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - instant.getTime();
}

/**
 * Convert a wall-clock date/time in `timeZone` to a UTC Date.
 * Iterates to stabilize around DST transitions.
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string = DAILY_CLOSING_TIMEZONE,
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  for (let i = 0; i < 4; i += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    utcMs = desiredAsUtc - offset;
  }

  return new Date(utcMs);
}

function parseDateParts(date: string): { year: number; month: number; day: number } | null {
  if (!DATE_RE.test(date)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = date.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const probe = zonedWallTimeToUtc(year, month, day, 12, 0);
  const parts = getZonedParts(probe, DAILY_CLOSING_TIMEZONE);
  if (parts.year !== year || parts.month !== month || parts.day !== day) {
    return null;
  }

  return { year, month, day };
}

function parseTime(time: string): { hour: number; minute: number } | null {
  const match = TIME_RE.exec(time);
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
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

function formatDateParts(parts: { year: number; month: number; day: number }): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function normalizeTimeInput(value: string): string {
  const trimmed = value.trim();
  // Browsers may submit HH:mm:ss from <input type="time">.
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  return trimmed;
}

export function resolveDailyClosingPeriod(
  input: DailyClosingPeriodInput,
): DailyClosingPeriodResult {
  const startTime = normalizeTimeInput(
    input.startTime ?? DEFAULT_DAILY_CLOSING_START,
  );
  const endTime = normalizeTimeInput(input.endTime ?? DEFAULT_DAILY_CLOSING_END);

  const dateParts = parseDateParts(input.date);
  if (!dateParts) {
    return { ok: false, message: "Data operacional inválida." };
  }

  const startParts = parseTime(startTime);
  const endParts = parseTime(endTime);
  if (!startParts || !endParts) {
    return { ok: false, message: "Horário inválido. Use o formato HH:mm." };
  }

  if (startTime === endTime) {
    return { ok: false, message: "Início e fim não podem ser iguais." };
  }

  const start = zonedWallTimeToUtc(
    dateParts.year,
    dateParts.month,
    dateParts.day,
    startParts.hour,
    startParts.minute,
  );

  const endOnNextDay =
    endParts.hour < startParts.hour ||
    (endParts.hour === startParts.hour && endParts.minute <= startParts.minute);

  const endDate = endOnNextDay
    ? addCalendarDays(dateParts.year, dateParts.month, dateParts.day, 1)
    : dateParts;

  const endExclusive = zonedWallTimeToUtc(
    endDate.year,
    endDate.month,
    endDate.day,
    endParts.hour,
    endParts.minute,
  );

  const durationMs = endExclusive.getTime() - start.getTime();
  if (durationMs <= 0) {
    return { ok: false, message: "O fim do período deve ser depois do início." };
  }

  if (durationMs > MAX_WINDOW_MS) {
    return {
      ok: false,
      message: "A janela operacional não pode ultrapassar 24 horas.",
    };
  }

  return {
    ok: true,
    period: {
      date: input.date,
      timezone: DAILY_CLOSING_TIMEZONE,
      startTime,
      endTime,
      start,
      endExclusive,
      startIso: start.toISOString(),
      endExclusiveIso: endExclusive.toISOString(),
    },
  };
}

/**
 * Operational date for "now" using the default 17:00–01:00 window.
 * Between 01:00 and 17:00 SP, returns the previous operational day.
 */
export function getCurrentOperationalDate(
  now: Date = new Date(),
  timeZone: string = DAILY_CLOSING_TIMEZONE,
): string {
  const parts = getZonedParts(now, timeZone);
  const calendarDate = formatDateParts(parts);
  const minutes = parts.hour * 60 + parts.minute;

  const defaultStartMinutes = 17 * 60;
  const defaultEndMinutes = 1 * 60;

  // Still in overnight tail of previous operational day: [00:00, 01:00)
  if (minutes < defaultEndMinutes) {
    const previous = addCalendarDays(parts.year, parts.month, parts.day, -1);
    return formatDateParts(previous);
  }

  // Gap after close and before open: use last completed operational day
  if (minutes < defaultStartMinutes) {
    const previous = addCalendarDays(parts.year, parts.month, parts.day, -1);
    return formatDateParts(previous);
  }

  return calendarDate;
}

export function getDailyClosingPeriodDefaults(now: Date = new Date()): {
  date: string;
  startTime: typeof DEFAULT_DAILY_CLOSING_START;
  endTime: typeof DEFAULT_DAILY_CLOSING_END;
} {
  return {
    date: getCurrentOperationalDate(now),
    startTime: DEFAULT_DAILY_CLOSING_START,
    endTime: DEFAULT_DAILY_CLOSING_END,
  };
}
