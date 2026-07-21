import { CopyDailyClosingButton } from "@/features/admin/reports/components/copy-daily-closing-button";
import { DailyClosingFilters } from "@/features/admin/reports/components/daily-closing-filters";
import { DailyClosingSections } from "@/features/admin/reports/components/daily-closing-sections";
import { DailyClosingSummaryCards } from "@/features/admin/reports/components/daily-closing-summary-cards";
import { DownloadDailyClosingCsvButton } from "@/features/admin/reports/components/download-daily-closing-csv-button";
import { OpenDailyClosingWhatsappLink } from "@/features/admin/reports/components/open-daily-closing-whatsapp-link";
import { buildDailyClosingWhatsappUrl } from "@/features/admin/reports/build-daily-closing-whatsapp-url";
import { formatDailyClosingCsv } from "@/features/admin/reports/format-daily-closing-csv";
import { formatDailyClosingWhatsapp } from "@/features/admin/reports/format-daily-closing-whatsapp";
import type { DailyClosingReport } from "@/features/admin/reports/daily-closing.types";
import { formatMoney } from "@/features/menu/format-money";

type DailyClosingPageProps = {
  report: DailyClosingReport;
};

function formatOperationalDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function DailyClosingPage({ report }: DailyClosingPageProps) {
  const summaryText = formatDailyClosingWhatsapp(report);
  const whatsappUrl = buildDailyClosingWhatsappUrl(summaryText);
  const csvExport = formatDailyClosingCsv(report);
  const generatedAt = new Date(report.generatedAtIso).toLocaleString("pt-BR", {
    timeZone: report.period.timezone,
  });
  const hasCompleted = report.summary.completedOrders > 0;

  return (
    <div data-testid="daily-closing-page" className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-stone-50">
          Fechamento operacional
        </h1>
        <p className="text-sm text-stone-400">
          Total vendido em pedidos concluídos — não é caixa conciliado nem
          resultado fiscal.
        </p>
        <p className="text-sm text-stone-300">
          Data operacional: {formatOperationalDate(report.period.date)} ·
          Período: {report.period.startTime}–{report.period.endTime} (
          {report.period.timezone})
        </p>
        <p className="text-xs text-stone-500">Atualizado às {generatedAt}</p>
      </header>

      <DailyClosingFilters
        date={report.period.date}
        startTime={report.period.startTime}
        endTime={report.period.endTime}
      />

      <DailyClosingSummaryCards summary={report.summary} />

      {hasCompleted ? (
        <p className="text-sm text-stone-400">
          Subtotal de produtos:{" "}
          {formatMoney(report.summary.productsSubtotalCents)}
        </p>
      ) : (
        <p
          data-testid="daily-closing-empty"
          className="rounded-2xl border border-stone-800 bg-stone-900/50 px-4 py-5 text-center text-sm text-stone-300"
        >
          Nenhuma movimentação encontrada nesta janela operacional.
        </p>
      )}

      <section className="space-y-3" aria-label="Exportar e compartilhar">
        <h2 className="text-base font-semibold tracking-wide text-stone-200">
          Exportar e compartilhar
        </h2>
        <div
          data-testid="daily-closing-actions"
          className="flex flex-wrap items-center gap-3"
        >
          <CopyDailyClosingButton text={summaryText} />
          <OpenDailyClosingWhatsappLink href={whatsappUrl} />
          <DownloadDailyClosingCsvButton
            content={csvExport.content}
            filename={csvExport.filename}
            mimeType={csvExport.mimeType}
          />
        </div>
      </section>

      <DailyClosingSections report={report} />

      <pre
        data-testid="daily-closing-summary-text"
        className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-stone-800 bg-stone-950/80 p-4 text-xs text-stone-300"
      >
        {summaryText}
      </pre>
    </div>
  );
}
