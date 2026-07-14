import type { MasterDashboardSummary } from "@/features/master/repositories/master-dashboard.repository";

type MasterSummaryCardsProps = {
  summary: MasterDashboardSummary;
};

export function MasterSummaryCards({ summary }: MasterSummaryCardsProps) {
  const cards = [
    { label: "Lojas", value: String(summary.storeCount) },
    { label: "Lojas abertas", value: String(summary.openStoreCount) },
    { label: "Pedidos", value: String(summary.orderCount) },
    { label: "Pendentes", value: String(summary.pendingOrderCount) },
    { label: "Concluídos", value: String(summary.completedOrderCount) },
  ];

  return (
    <section
      data-testid="master-summary-cards"
      className="grid grid-cols-2 gap-3 lg:grid-cols-5"
    >
      {cards.map((card) => (
        <article
          key={card.label}
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
