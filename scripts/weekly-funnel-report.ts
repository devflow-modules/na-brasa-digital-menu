import { PrismaClient } from "@prisma/client";
import {
  formatWeeklyFunnelReportText,
  loadWeeklyFunnelReport,
} from "../src/features/analytics/weekly-funnel-report";
import { resolveWeeklyFunnelReportPeriod } from "../src/features/analytics/weekly-funnel-report-period";

function resolveStoreSlug(): string {
  return (
    process.env.STORE_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_STORE_SLUG?.trim() ||
    "na-brasa"
  );
}

function resolveFormat(): "text" | "json" {
  const raw = process.env.REPORT_FORMAT?.trim().toLowerCase();
  if (!raw || raw === "text") {
    return "text";
  }
  if (raw === "json") {
    return "json";
  }
  throw new Error('REPORT_FORMAT must be "text" or "json"');
}

async function main(): Promise<void> {
  const storeSlug = resolveStoreSlug();
  const format = resolveFormat();
  const period = resolveWeeklyFunnelReportPeriod({
    from: process.env.FROM,
    to: process.env.TO,
  });

  const prisma = new PrismaClient();
  try {
    const report = await loadWeeklyFunnelReport(
      { storeSlug, period },
      prisma,
    );

    if (format === "json") {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    process.stdout.write(formatWeeklyFunnelReportText(report));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
