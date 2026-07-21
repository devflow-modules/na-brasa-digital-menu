import { aggregateDailyClosingReport } from "@/features/admin/reports/daily-closing.service";
import { listOrdersForDailyClosing } from "@/features/admin/reports/daily-closing.repository";
import {
  resolveDailyClosingPeriod,
  type DailyClosingPeriodInput,
} from "@/features/admin/reports/daily-closing-period";
import type { DailyClosingReport } from "@/features/admin/reports/daily-closing.types";

export type BuildDailyClosingReportResult =
  | { ok: true; report: DailyClosingReport }
  | { ok: false; message: string };

/**
 * Server entrypoint: resolve period → load orders → aggregate.
 */
export async function buildDailyClosingReport(options: {
  storeId: string;
  storeName: string;
  periodInput: DailyClosingPeriodInput;
}): Promise<BuildDailyClosingReportResult> {
  const periodResult = resolveDailyClosingPeriod(options.periodInput);
  if (!periodResult.ok) {
    return periodResult;
  }

  const orders = await listOrdersForDailyClosing({
    storeId: options.storeId,
    start: periodResult.period.start,
    endExclusive: periodResult.period.endExclusive,
  });

  return {
    ok: true,
    report: aggregateDailyClosingReport({
      storeName: options.storeName,
      period: periodResult.period,
      orders,
    }),
  };
}
