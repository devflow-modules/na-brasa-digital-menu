import Link from "next/link";
import {
  formatDateTime,
  formatDeliveryType,
  formatMoney,
  formatOrderElapsedTime,
  formatPaymentMethod,
  formatPhone,
} from "@/features/admin/orders/admin-orders-formatters";
import type { AdminOrderListItem } from "@/features/admin/orders/admin-orders.types";
import { OrderSourceBadge } from "@/features/admin/orders/components/order-source-badge";
import { OrderStatusBadge } from "@/features/admin/orders/components/order-status-badge";

type OrdersListProps = {
  orders: AdminOrderListItem[];
  filtersActive?: boolean;
};

function OrderCreatedAtDisplay({
  createdAt,
  now,
}: {
  createdAt: Date;
  now: Date;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        data-testid="admin-order-elapsed"
        className="font-medium text-stone-200"
      >
        {formatOrderElapsedTime(createdAt, now)}
      </span>
      <time
        dateTime={createdAt.toISOString()}
        data-testid="admin-order-created-at"
        className="text-xs text-stone-500"
      >
        {formatDateTime(createdAt)}
      </time>
    </div>
  );
}

export function OrdersList({
  orders,
  filtersActive = false,
}: OrdersListProps) {
  const now = new Date();

  if (orders.length === 0) {
    return (
      <div
        data-testid="admin-orders-empty"
        data-filters-active={filtersActive ? "true" : "false"}
        className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/40 px-5 py-10 text-center"
      >
        {filtersActive ? (
          <>
            <p className="text-base font-medium text-stone-100">
              Nenhum pedido corresponde aos filtros aplicados.
            </p>
            <p className="mt-2 text-sm text-stone-400">
              A loja pode ter pedidos fora destes filtros. Ajuste a busca ou
              limpe para ver a fila completa.
            </p>
            <Link
              href="/admin"
              data-testid="admin-orders-empty-clear"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 px-4 text-sm font-semibold text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              Limpar filtros
            </Link>
          </>
        ) : (
          <>
            <p className="text-base font-medium text-stone-100">
              Nenhum pedido encontrado.
            </p>
            <p className="mt-2 text-sm text-stone-400">
              Quando chegar um pedido online ou uma comanda de balcão, ele
              aparecerá aqui.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <section data-testid="admin-orders-list" className="flex flex-col gap-3">
      <div className="hidden overflow-hidden rounded-2xl border border-stone-800 md:block">
        <table className="min-w-full divide-y divide-stone-800 text-left text-sm">
          <thead className="bg-stone-900/80 text-xs uppercase tracking-wide text-stone-400">
            <tr>
              <th className="px-4 py-3 font-medium">Pedido</th>
              <th className="px-4 py-3 font-medium">Origem</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Pagamento</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Quando</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800 bg-stone-950/40">
            {orders.map((order) => (
              <tr
                key={order.id}
                data-testid="admin-order-row"
                data-order-id={order.id}
                className="text-stone-200"
              >
                <td className="px-4 py-3 font-medium text-orange-100">
                  #{order.code}
                </td>
                <td className="px-4 py-3">
                  <OrderSourceBadge source={order.source} />
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span>{order.customerName}</span>
                    <span className="text-xs text-stone-400">
                      {formatPhone(order.customerPhone)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {formatDeliveryType(order.deliveryType)}
                </td>
                <td className="px-4 py-3">
                  {formatPaymentMethod(order.paymentMethod, {
                    paid: order.status === "COMPLETED",
                  })}
                </td>
                <td className="px-4 py-3">{formatMoney(order.totalCents)}</td>
                <td className="px-4 py-3">
                  <OrderCreatedAtDisplay createdAt={order.createdAt} now={now} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/pedidos/${order.id}`}
                    className="font-medium text-orange-300 underline-offset-2 hover:underline"
                  >
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {orders.map((order) => (
          <article
            key={order.id}
            data-testid="admin-order-card"
            data-order-id={order.id}
            className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-orange-100">
                  #{order.code}
                </p>
                <p className="mt-1 text-sm text-stone-300">
                  {order.customerName}
                </p>
                <p className="text-xs text-stone-400">
                  {formatPhone(order.customerPhone)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <OrderSourceBadge source={order.source} />
                <OrderStatusBadge status={order.status} />
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-stone-500">Tipo</dt>
                <dd className="text-stone-200">
                  {formatDeliveryType(order.deliveryType)}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Pagamento</dt>
                <dd className="text-stone-200">
                  {formatPaymentMethod(order.paymentMethod, {
                    paid: order.status === "COMPLETED",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Total</dt>
                <dd className="text-stone-200">
                  {formatMoney(order.totalCents)}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Quando</dt>
                <dd>
                  <OrderCreatedAtDisplay createdAt={order.createdAt} now={now} />
                </dd>
              </div>
            </dl>

            <Link
              href={`/admin/pedidos/${order.id}`}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-stone-950"
            >
              Ver detalhes
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
