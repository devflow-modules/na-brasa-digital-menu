import type { Page } from "@playwright/test";
import {
  DAILY_CLOSING_E2E_DATE,
  DAILY_CLOSING_E2E_END,
  DAILY_CLOSING_E2E_START,
  dailyClosingReportUrl,
} from "./daily-closing-fixtures";

export async function openDailyClosingReport(
  page: Page,
  options?: { date?: string; start?: string; end?: string },
): Promise<void> {
  await page.goto(dailyClosingReportUrl(options));
}

export async function applyDailyClosingFilters(
  page: Page,
  options: { date: string; start: string; end: string },
): Promise<void> {
  await page.getByTestId("daily-closing-date").fill(options.date);
  await page.getByTestId("daily-closing-start").fill(options.start);
  await page.getByTestId("daily-closing-end").fill(options.end);
  await page.getByTestId("daily-closing-refresh").click();
  await page.waitForURL((url) => {
    const params = url.searchParams;
    return (
      params.get("date") === options.date &&
      params.get("start") === options.start &&
      params.get("end") === options.end
    );
  });
}

export async function openDefaultDailyClosingWindow(page: Page): Promise<void> {
  await openDailyClosingReport(page, {
    date: DAILY_CLOSING_E2E_DATE,
    start: DAILY_CLOSING_E2E_START,
    end: DAILY_CLOSING_E2E_END,
  });
}

/** Preview lives in a closed <details>; textContent works without expanding. */
export async function readDailyClosingSummaryText(page: Page): Promise<string> {
  return page
    .getByTestId("daily-closing-summary-text")
    .evaluate((el) => (el.textContent ?? "").replace(/\u00a0/g, " "));
}

export async function expandDailyClosingPreview(page: Page): Promise<void> {
  await page
    .getByTestId("daily-closing-preview")
    .evaluate((el) => {
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
      }
    });
}
