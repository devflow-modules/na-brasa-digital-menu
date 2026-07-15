import Link from "next/link";
import { LogoutButton } from "@/features/admin/auth/components/logout-button";
import type {
  AdminOrderListItem,
  AdminOrdersSummary,
} from "@/features/admin/orders/admin-orders.types";
import { OrdersList } from "@/features/admin/orders/components/orders-list";
import { OrdersSummaryCards } from "@/features/admin/orders/components/orders-summary-cards";

type AdminOrdersDashboardProps = {
  sessionEmail: string;
  storeName: string;
  isMasterTransitional?: boolean;
  counterNavHref?: string | null;
  menuNavHref?: string | null;
  menuNavLabel?: string | null;
  settingsNavHref?: string | null;
  orders: AdminOrderListItem[];
  summary: AdminOrdersSummary;
};

export function AdminOrdersDashboard({
  sessionEmail,
  storeName,
  isMasterTransitional = false,
  counterNavHref = null,
  menuNavHref = null,
  menuNavLabel = null,
  settingsNavHref = null,
  orders,
  summary,
}: AdminOrdersDashboardProps) {
  return (
    <div
      data-testid="admin-orders-dashboard"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-300/80">
            Área restrita · Store-scoped
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-orange-50 sm:text-3xl">
            Pedidos — {storeName}
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            Pedidos da sua loja recebidos pelo cardápio.
          </p>
          <p className="mt-2 text-xs text-stone-500">Sessão: {sessionEmail}</p>
          {isMasterTransitional ? (
            <p
              data-testid="admin-master-transitional-note"
              className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90"
            >
              Acesso MASTER ao /admin é transicional — use /master para operação
              da plataforma.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {counterNavHref ? (
            <Link
              href={counterNavHref}
              data-testid="admin-counter-nav-link"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-orange-500/50 bg-orange-500 px-4 text-sm font-semibold text-stone-950 hover:bg-orange-400"
            >
              Balcão
            </Link>
          ) : null}
          {settingsNavHref ? (
            <Link
              href={settingsNavHref}
              data-testid="admin-settings-nav-link"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-600 bg-stone-900 px-4 text-sm font-semibold text-stone-100 hover:bg-stone-800"
            >
              Configurações
            </Link>
          ) : null}
          {menuNavHref && menuNavLabel ? (
            <Link
              href={menuNavHref}
              data-testid="admin-menu-nav-link"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 text-sm font-semibold text-orange-100 hover:bg-orange-500/20"
            >
              {menuNavLabel}
            </Link>
          ) : null}
          <LogoutButton className="border-stone-700 bg-stone-900 text-stone-100 hover:bg-stone-800" />
        </div>
      </header>

      <OrdersSummaryCards summary={summary} />
      <OrdersList orders={orders} />
    </div>
  );
}
