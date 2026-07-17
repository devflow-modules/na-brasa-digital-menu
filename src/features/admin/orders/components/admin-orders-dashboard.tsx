import type { AdminOrderQueueFilters } from "@/features/admin/orders/admin-order-queue-filters";
import { hasAdminOrderQueueFilters } from "@/features/admin/orders/admin-order-queue-filters";
import type {
  AdminOrderListItem,
  AdminOrdersSummary,
} from "@/features/admin/orders/admin-orders.types";
import { AdminOrderQueueFiltersForm } from "@/features/admin/orders/components/admin-order-queue-filters-form";
import { OrdersList } from "@/features/admin/orders/components/orders-list";
import { OrdersSummaryCards } from "@/features/admin/orders/components/orders-summary-cards";

type AdminOrdersDashboardProps = {
  storeName: string;
  orders: AdminOrderListItem[];
  summary: AdminOrdersSummary;
  filters: AdminOrderQueueFilters;
};

export function AdminOrdersDashboard({
  storeName,
  orders,
  summary,
  filters,
}: AdminOrdersDashboardProps) {
  const filtersActive = hasAdminOrderQueueFilters(filters);

  return (
    <div
      data-testid="admin-orders-dashboard"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <div>
        <h1 className="text-2xl font-semibold text-orange-50 sm:text-3xl">
          Pedidos — {storeName}
        </h1>
        <p className="mt-2 text-sm text-stone-400">
          Fila da loja: pedidos online e comandas de balcão.
        </p>
      </div>

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
