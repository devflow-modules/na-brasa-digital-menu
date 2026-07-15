"use client";

import type { CartState } from "@/features/cart/types";
import { getCheckoutEstimatedTotalCents } from "@/features/checkout/get-checkout-estimated-total-cents";
import { formatMoney } from "@/features/menu/format-money";

type CheckoutCartSummaryProps = {
  cart: CartState;
  deliveryFeeCents: number;
  showDeliveryFee: boolean;
};

export function CheckoutCartSummary({
  cart,
  deliveryFeeCents,
  showDeliveryFee,
}: CheckoutCartSummaryProps) {
  const estimatedTotalCents = getCheckoutEstimatedTotalCents({
    subtotalCents: cart.subtotalCents,
    deliveryFeeCents,
    showDeliveryFee,
  });

  const itemLabel =
    cart.totalQuantity === 1
      ? "1 item no pedido"
      : `${cart.totalQuantity} itens no pedido`;

  return (
    <section
      data-testid="checkout-order-summary"
      className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900/80 p-4 shadow-sm shadow-black/20"
    >
      <div>
        <h2 className="text-lg font-semibold text-orange-50">
          Confira seu pedido
        </h2>
        <p className="mt-1 text-sm text-stone-400">{itemLabel}</p>
        <p className="mt-2 text-xs leading-relaxed text-stone-500">
          O servidor recalcula os valores ao finalizar.
        </p>
        <p className="mt-2 text-xs font-medium text-orange-200/90">
          O pedido será enviado para confirmação no WhatsApp.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {cart.items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 border-b border-stone-800 pb-3 last:border-b-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-100">
                {item.quantity}x {item.productName}
              </p>
              {item.selectedAddons.length > 0 ? (
                <p className="mt-1 text-xs text-stone-400">
                  {item.selectedAddons.map((addon) => addon.name).join(", ")}
                </p>
              ) : null}
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-orange-300">
              {formatMoney(item.totalCents)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-3 text-stone-300">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(cart.subtotalCents)}</dd>
        </div>
        {showDeliveryFee ? (
          <div className="flex items-center justify-between gap-3 text-stone-300">
            <dt>Taxa de entrega</dt>
            <dd className="tabular-nums">
              {deliveryFeeCents > 0
                ? formatMoney(deliveryFeeCents)
                : "Grátis"}
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t border-stone-800 pt-2 text-base font-bold text-orange-200">
          <dt>Total estimado</dt>
          <dd
            data-testid="checkout-estimated-total"
            className="tabular-nums text-lg text-orange-300"
          >
            {formatMoney(estimatedTotalCents)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
