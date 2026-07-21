import { formatMoney } from "@/features/menu/format-money";
import type { DailyClosingSummary } from "@/features/admin/reports/daily-closing.types";

type DailyClosingSummaryCardsProps = {
  summary: DailyClosingSummary;
};

export function DailyClosingSummaryCards({
  summary,
}: DailyClosingSummaryCardsProps) {
  const cards = [
    {
      label: "Total vendido (concluídos)",
      value: formatMoney(summary.grossTotalCents),
      testId: "daily-closing-card-total",
    },
    {
      label: "Pedidos concluídos",
      value: String(summary.completedOrders),
      testId: "daily-closing-card-orders",
    },
    {
      label: "Itens vendidos",
      value: String(summary.itemsSold),
      testId: "daily-closing-card-items",
    },
    {
      label: "Ticket médio",
      value: formatMoney(summary.averageTicketCents),
      testId: "daily-closing-card-ticket",
    },
    {
      label: "Taxas de entrega",
      value: formatMoney(summary.deliveryFeesCents),
      testId: "daily-closing-card-fees",
    },
    {
      label: "Cancelados",
      value: String(summary.cancelledOrders),
      testId: "daily-closing-card-cancelled",
    },
  ];

  return (
    <section
      data-testid="daily-closing-summary-cards"
      className="grid grid-cols-2 gap-3 lg:grid-cols-3"
    >
      {cards.map((card) => (
        <article
          key={card.label}
          data-testid={card.testId}
          className="rounded-2xl border border-stone-800 bg-stone-900/80 px-4 py-4"
        >
          <p className="text-xs uppercase tracking-wide text-stone-400">
            {card.label}
          </p>
          <p className="mt-2 text-xl font-semibold text-orange-100">
            {card.value}
          </p>
        </article>
      ))}
    </section>
  );
}
