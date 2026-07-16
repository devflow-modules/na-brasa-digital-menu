import type { UserRole } from "@prisma/client";
import Link from "next/link";
import { hasAdminPermission } from "@/features/admin/auth/admin-permissions";
import { CounterOrderFinalizePanel } from "@/features/admin/counter-order/components/counter-order-finalize-panel";
import { computeCashChangeCents } from "@/features/admin/counter-order/counter-order-change";
import {
  formatDateTime,
  formatDeliveryType,
  formatMoney,
  formatOrderSource,
  formatPaymentMethod,
  formatPhone,
} from "@/features/admin/orders/admin-orders-formatters";
import type { AdminOrderDetail } from "@/features/admin/orders/admin-orders.types";
import { OrderStatusBadge } from "@/features/admin/orders/components/order-status-badge";
import { OrderStatusActions } from "@/features/admin/orders/components/order-status-actions";

type OrderDetailCardProps = {
  order: AdminOrderDetail;
  role: UserRole;
};

export function OrderDetailCard({ order, role }: OrderDetailCardProps) {
  const canReceiveCounter =
    order.source === "COUNTER" &&
    order.status === "READY" &&
    order.paidAt == null &&
    hasAdminPermission(role, "orders.status.complete");

  const cashChangeCents =
    order.paymentMethod === "CASH" && typeof order.changeForCents === "number"
      ? computeCashChangeCents(order.totalCents, order.changeForCents)
      : null;

  return (
    <div data-testid="admin-order-detail" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-300/80">
            Pedido
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-orange-50">
            #{order.code}
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            {formatDateTime(order.createdAt)} · {formatOrderSource(order.source)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {canReceiveCounter ? (
        <CounterOrderFinalizePanel
          orderId={order.id}
          totalCents={order.totalCents}
        />
      ) : null}

      <OrderStatusActions
        orderId={order.id}
        status={order.status}
        deliveryType={order.deliveryType}
        role={role}
        source={order.source}
        paidAt={order.paidAt}
      />

      <section className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
        <h2 className="text-sm font-semibold text-orange-50">Cliente</h2>
        <dl className="mt-3 grid gap-3 text-sm text-stone-300 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-stone-500">Nome</dt>
            <dd className="mt-1 text-stone-100">{order.customerName}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Telefone</dt>
            <dd className="mt-1 text-stone-100">
              {formatPhone(order.customerPhone)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Tipo</dt>
            <dd className="mt-1 text-stone-100">
              {formatDeliveryType(order.deliveryType)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Pagamento</dt>
            <dd className="mt-1 text-stone-100">
              {formatPaymentMethod(order.paymentMethod)}
              {order.source !== "COUNTER" &&
              typeof order.changeForCents === "number" ? (
                <span className="text-stone-400">
                  {" "}
                  · troco para {formatMoney(order.changeForCents)}
                </span>
              ) : null}
            </dd>
          </div>
          {order.paidAt ? (
            <div>
              <dt className="text-xs text-stone-500">Recebido em</dt>
              <dd
                data-testid="order-paid-at"
                className="mt-1 text-stone-100"
              >
                {formatDateTime(order.paidAt)}
              </dd>
            </div>
          ) : null}
          {order.source === "COUNTER" &&
          order.paymentMethod === "CASH" &&
          typeof order.changeForCents === "number" ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-stone-500">Dinheiro</dt>
              <dd
                data-testid="order-cash-tender"
                className="mt-1 text-stone-100"
              >
                Recebido {formatMoney(order.changeForCents)}
                {cashChangeCents != null
                  ? ` · troco ${formatMoney(cashChangeCents)}`
                  : null}
              </dd>
            </div>
          ) : null}
          {order.deliveryType === "DELIVERY" && order.deliveryAddress ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-stone-500">Endereço</dt>
              <dd className="mt-1 text-stone-100">{order.deliveryAddress}</dd>
            </div>
          ) : null}
          {order.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-stone-500">Observações</dt>
              <dd className="mt-1 whitespace-pre-wrap text-stone-100">
                {order.notes}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
        <h2 className="text-sm font-semibold text-orange-50">Itens</h2>
        <ul className="mt-3 flex flex-col gap-4">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="border-b border-stone-800 pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-stone-100">
                    {item.quantity}x {item.productNameSnapshot}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    Unitário {formatMoney(item.unitPriceCents)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-orange-200">
                  {formatMoney(item.totalCents)}
                </p>
              </div>

              {item.addons.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-stone-400">
                  {item.addons.map((addon) => (
                    <li key={addon.id}>
                      + {addon.addonNameSnapshot} —{" "}
                      {formatMoney(addon.addonPriceCents)}
                    </li>
                  ))}
                </ul>
              ) : null}

              {item.notes ? (
                <p className="mt-2 text-xs text-stone-400">
                  Obs. item: {item.notes}
                </p>
              ) : null}
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-stone-800 pt-4 text-sm">
          <div className="flex justify-between gap-3 text-stone-300">
            <dt>Subtotal</dt>
            <dd>{formatMoney(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-stone-300">
            <dt>Entrega</dt>
            <dd>
              {order.deliveryFeeCents > 0
                ? formatMoney(order.deliveryFeeCents)
                : "R$ 0,00"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 text-base font-semibold text-orange-100">
            <dt>Total</dt>
            <dd>{formatMoney(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      {order.whatsappMessage ? (
        <section className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
          <h2 className="text-sm font-semibold text-orange-50">
            Mensagem WhatsApp
          </h2>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-stone-800 bg-stone-950/80 p-3 text-xs leading-relaxed text-stone-300">
            {order.whatsappMessage}
          </pre>
        </section>
      ) : null}

      <Link
        href="/admin"
        className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 px-4 text-sm font-medium text-stone-100 hover:border-orange-500/50 hover:text-orange-100"
      >
        Voltar para pedidos
      </Link>
    </div>
  );
}
