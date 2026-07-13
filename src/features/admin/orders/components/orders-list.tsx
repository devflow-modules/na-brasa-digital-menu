import Link from "next/link";
import {
  formatDateTime,
  formatDeliveryType,
  formatMoney,
  formatPaymentMethod,
  formatPhone,
} from "@/features/admin/orders/admin-orders-formatters";
import type { AdminOrderListItem } from "@/features/admin/orders/admin-orders.types";
import { OrderStatusBadge } from "@/features/admin/orders/components/order-status-badge";

type OrdersListProps = {
  orders: AdminOrderListItem[];
};

export function OrdersList({ orders }: OrdersListProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/40 px-5 py-10 text-center">
        <p className="text-base font-medium text-stone-100">
          Nenhum pedido recebido ainda.
        </p>
        <p className="mt-2 text-sm text-stone-400">
          Quando um cliente finalizar pelo cardápio, o pedido aparecerá aqui.
        </p>
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
              <tr key={order.id} className="text-stone-200">
                <td className="px-4 py-3 font-medium text-orange-100">
                  #{order.code}
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
                  {formatPaymentMethod(order.paymentMethod)}
                </td>
                <td className="px-4 py-3 font-semibold text-orange-200">
                  {formatMoney(order.totalCents)}
                </td>
                <td className="px-4 py-3 text-stone-300">
                  {formatDateTime(order.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/pedidos/${order.id}`}
                    className="text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
                  >
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {orders.map((order) => (
          <li
            key={order.id}
            className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-orange-100">
                  #{order.code}
                </p>
                <p className="mt-1 text-sm text-stone-200">
                  {order.customerName}
                </p>
                <p className="text-xs text-stone-400">
                  {formatPhone(order.customerPhone)}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-300">
              <div>
                <dt className="text-stone-500">Tipo</dt>
                <dd>{formatDeliveryType(order.deliveryType)}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Pagamento</dt>
                <dd>{formatPaymentMethod(order.paymentMethod)}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Total</dt>
                <dd className="font-semibold text-orange-200">
                  {formatMoney(order.totalCents)}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Quando</dt>
                <dd>{formatDateTime(order.createdAt)}</dd>
              </div>
            </dl>

            <Link
              href={`/admin/pedidos/${order.id}`}
              className="mt-4 inline-flex text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
            >
              Ver detalhes
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
