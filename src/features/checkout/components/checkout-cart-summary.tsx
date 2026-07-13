"use client";

import type { CartState } from "@/features/cart/types";
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
  const estimatedTotalCents =
    cart.subtotalCents + (showDeliveryFee ? deliveryFeeCents : 0);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-stone-800 bg-stone-900/70 p-4">
      <div>
        <h2 className="text-base font-semibold text-orange-50">
          Resumo do pedido
        </h2>
        <p className="mt-1 text-xs text-stone-400">
          Totais estimados no cliente. O server recalculará na próxima etapa.
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
            <p className="shrink-0 text-sm font-semibold text-orange-300">
              {formatMoney(item.totalCents)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-3 text-stone-300">
          <dt>Subtotal</dt>
          <dd>{formatMoney(cart.subtotalCents)}</dd>
        </div>
        {showDeliveryFee ? (
          <div className="flex items-center justify-between gap-3 text-stone-300">
            <dt>Entrega</dt>
            <dd>
              {deliveryFeeCents > 0
                ? formatMoney(deliveryFeeCents)
                : "Grátis"}
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 pt-1 text-base font-semibold text-orange-200">
          <dt>Total estimado</dt>
          <dd>{formatMoney(estimatedTotalCents)}</dd>
        </div>
      </dl>
    </section>
  );
}
