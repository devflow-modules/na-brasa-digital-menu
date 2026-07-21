import type { AdminOrderQueueFilters } from "@/features/admin/orders/admin-order-queue-filters";
import { hasAdminOrderQueueFilters } from "@/features/admin/orders/admin-order-queue-filters";
import type {
  AdminOrderListItem,
  AdminOrdersSummary,
} from "@/features/admin/orders/admin-orders.types";
import { AdminOrderQueueFiltersForm } from "@/features/admin/orders/components/admin-order-queue-filters-form";
import { OrdersList } from "@/features/admin/orders/components/orders-list";
import { OrdersSummaryCards } from "@/features/admin/orders/components/orders-summary-cards";
import { AdminPageHeader } from "@/features/admin-shell/admin-page-header";

type AdminOrdersDashboardProps = {
  orders: AdminOrderListItem[];
  summary: AdminOrdersSummary;
  filters: AdminOrderQueueFilters;
};

export function AdminOrdersDashboard({
  orders,
  summary,
  filters,
}: AdminOrdersDashboardProps) {
  const filtersActive = hasAdminOrderQueueFilters(filters);

  return (
    <div
      data-testid="admin-orders-dashboard"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"
    >
      <AdminPageHeader
        title="Pedidos pendentes"
        description="Acompanhe os pedidos online e de balcão que ainda exigem ação."
      />

      <div>
        <p className="mb-2 text-xs text-stone-500">
          {filtersActive
            ? 'As métricas gerais consideram toda a operação da loja. “Na lista” mostra a quantidade de pedidos exibidos abaixo, limitada aos 50 resultados mais recentes que correspondem aos filtros aplicados.'
            : 'As métricas gerais consideram toda a operação da loja. “Na lista” mostra a quantidade de pedidos exibidos abaixo, limitada aos 50 pedidos mais recentes.'}
        </p>
        <OrdersSummaryCards summary={summary} />
      </div>

      <AdminOrderQueueFiltersForm filters={filters} />

      {filtersActive ? (
        <p
          data-testid="admin-orders-filter-results-note"
          className="text-sm text-stone-400"
        >
          Exibindo até 50 pedidos mais recentes que correspondem aos filtros.
        </p>
      ) : null}

      <OrdersList orders={orders} filtersActive={filtersActive} />
    </div>
  );
}
