import { formatMoney } from "@/features/menu/format-money";
import type { DailyClosingSummary } from "@/features/admin/reports/daily-closing.types";

type DailyClosingSummaryCardsProps = {
  summary: DailyClosingSummary;
};

export function DailyClosingSummaryCards({
  summary,
}: DailyClosingSummaryCardsProps) {
  const cancelledAlert = summary.cancelledOrders > 0;

  return (
    <section
      data-testid="daily-closing-summary-cards"
      className="space-y-3"
      aria-label="Resumo operacional"
    >
      <h2 className="text-base font-semibold tracking-wide text-stone-200">
        Resumo operacional
      </h2>

      <article
        data-testid="daily-closing-card-total"
        className="rounded-2xl border border-orange-500/40 bg-gradient-to-br from-stone-900 to-stone-950 px-5 py-5 sm:px-6"
      >
        <p className="text-xs uppercase tracking-wide text-orange-200/80">
          Total vendido (concluídos)
        </p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-orange-50 sm:text-4xl">
          {formatMoney(summary.grossTotalCents)}
        </p>
      </article>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <article
          data-testid="daily-closing-card-orders"
          className="rounded-2xl border border-stone-800 bg-stone-900/80 px-4 py-4"
        >
          <p className="text-xs uppercase tracking-wide text-stone-400">
            Pedidos concluídos
          </p>
          <p className="mt-2 text-xl font-semibold text-stone-100">
            {summary.completedOrders}
          </p>
        </article>

        <article
          data-testid="daily-closing-card-items"
          className="rounded-2xl border border-stone-800 bg-stone-900/80 px-4 py-4"
        >
          <p className="text-xs uppercase tracking-wide text-stone-400">
            Itens vendidos
          </p>
          <p className="mt-2 text-xl font-semibold text-stone-100">
            {summary.itemsSold}
          </p>
        </article>

        <article
          data-testid="daily-closing-card-ticket"
          className="rounded-2xl border border-stone-800 bg-stone-900/60 px-4 py-3"
        >
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Ticket médio
          </p>
          <p className="mt-2 text-lg font-medium text-stone-200">
            {formatMoney(summary.averageTicketCents)}
          </p>
        </article>

        <article
          data-testid="daily-closing-card-fees"
          className="rounded-2xl border border-stone-800 bg-stone-900/60 px-4 py-3"
        >
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Taxas de entrega
          </p>
          <p className="mt-2 text-lg font-medium text-stone-200">
            {formatMoney(summary.deliveryFeesCents)}
          </p>
        </article>

        <article
          data-testid="daily-closing-card-cancelled"
          data-alert={cancelledAlert ? "true" : "false"}
          className={
            cancelledAlert
              ? "rounded-2xl border border-amber-700/70 bg-amber-950/35 px-4 py-3"
              : "rounded-2xl border border-stone-800 bg-stone-900/60 px-4 py-3"
          }
        >
          <p
            className={
              cancelledAlert
                ? "text-xs uppercase tracking-wide text-amber-200/80"
                : "text-xs uppercase tracking-wide text-stone-500"
            }
          >
            Cancelados
          </p>
          <p
            className={
              cancelledAlert
                ? "mt-2 text-lg font-semibold text-amber-100"
                : "mt-2 text-lg font-medium text-stone-200"
            }
          >
            {summary.cancelledOrders}
          </p>
        </article>
      </div>
    </section>
  );
}
