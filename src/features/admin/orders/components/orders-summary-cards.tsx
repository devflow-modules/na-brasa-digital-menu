import {
  formatMoney,
} from "@/features/admin/orders/admin-orders-formatters";
import type { AdminOrdersSummary } from "@/features/admin/orders/admin-orders.types";

type OrdersSummaryCardsProps = {
  summary: AdminOrdersSummary;
};

export function OrdersSummaryCards({ summary }: OrdersSummaryCardsProps) {
  const cards = [
    {
      label: "Pedidos hoje",
      value: String(summary.ordersToday),
    },
    {
      label: "Pendentes",
      value: String(summary.pendingCount),
    },
    {
      label: "Receita estimada hoje",
      value: formatMoney(summary.revenueTodayCents),
    },
    {
      label: "Total exibido",
      value: String(summary.displayedCount),
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
