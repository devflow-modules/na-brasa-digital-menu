import type {
  AdminOrderListItem,
  AdminOrdersSummary,
} from "@/features/admin/orders/admin-orders.types";
import { OrdersList } from "@/features/admin/orders/components/orders-list";
import { OrdersSummaryCards } from "@/features/admin/orders/components/orders-summary-cards";

type AdminOrdersDashboardProps = {
  storeName: string;
  orders: AdminOrderListItem[];
  summary: AdminOrdersSummary;
};

export function AdminOrdersDashboard({
  storeName,
  orders,
  summary,
}: AdminOrdersDashboardProps) {
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

      <OrdersSummaryCards summary={summary} />
      <OrdersList orders={orders} />
    </div>
  );
}
