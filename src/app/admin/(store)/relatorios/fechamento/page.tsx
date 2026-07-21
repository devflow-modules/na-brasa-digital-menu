import type { Metadata } from "next";
import { canReadReports } from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { AdminAccessDenied } from "@/features/admin/chrome/admin-access-denied";
import { buildDailyClosingReport } from "@/features/admin/reports/build-daily-closing-report";
import { DailyClosingFilters } from "@/features/admin/reports/components/daily-closing-filters";
import { DailyClosingPage } from "@/features/admin/reports/components/daily-closing-page";
import { getDailyClosingPeriodDefaults } from "@/features/admin/reports/daily-closing-period";
import {
  DEFAULT_DAILY_CLOSING_END,
  DEFAULT_DAILY_CLOSING_START,
} from "@/features/admin/reports/daily-closing.types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fechamento operacional — Admin",
  description: "Relatório diário de fechamento operacional da loja.",
};

type PageProps = {
  searchParams: Promise<{
    date?: string | string[];
    start?: string | string[];
    end?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function AdminDailyClosingPage({ searchParams }: PageProps) {
  const context = await requireAdminStoreContext();

  if (!canReadReports(context.role)) {
    return (
      <main>
        <AdminAccessDenied role={context.role} />
      </main>
    );
  }

  const params = await searchParams;
  const defaults = getDailyClosingPeriodDefaults();
  const date = firstParam(params.date)?.trim() || defaults.date;
  const startTime =
    firstParam(params.start)?.trim() || DEFAULT_DAILY_CLOSING_START;
  const endTime = firstParam(params.end)?.trim() || DEFAULT_DAILY_CLOSING_END;

  const result = await buildDailyClosingReport({
    storeId: context.storeId,
    storeName: context.storeName,
    periodInput: { date, startTime, endTime },
  });

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-stone-50">
            Fechamento operacional
          </h1>
          <p className="text-sm text-stone-400">
            Total vendido em pedidos concluídos — não é caixa conciliado nem
            resultado fiscal.
          </p>
        </header>
        <DailyClosingFilters
          date={date}
          startTime={startTime}
          endTime={endTime}
        />
        <p
          data-testid="daily-closing-error"
          className="rounded-2xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-100"
        >
          {result.message}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <DailyClosingPage report={result.report} />
    </main>
  );
}
