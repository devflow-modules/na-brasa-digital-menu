import { LogoutButton } from "@/features/admin/auth/components/logout-button";
import type {
  AdminOrderListItem,
  AdminOrdersSummary,
} from "@/features/admin/orders/admin-orders.types";
import { OrdersList } from "@/features/admin/orders/components/orders-list";
import { OrdersSummaryCards } from "@/features/admin/orders/components/orders-summary-cards";

type AdminOrdersDashboardProps = {
  sessionEmail: string;
  orders: AdminOrderListItem[];
  summary: AdminOrdersSummary;
};

export function AdminOrdersDashboard({
  sessionEmail,
  orders,
  summary,
}: AdminOrdersDashboardProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-300/80">
            Área restrita
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-orange-50 sm:text-3xl">
            Pedidos Na Brasa
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            Visualização read-only dos pedidos recebidos pelo cardápio.
          </p>
          <p className="mt-2 text-xs text-stone-500">Sessão: {sessionEmail}</p>
        </div>
        <LogoutButton className="border-stone-700 bg-stone-900 text-stone-100 hover:bg-stone-800" />
      </header>

      <OrdersSummaryCards summary={summary} />
      <OrdersList orders={orders} />
    </div>
  );
}
