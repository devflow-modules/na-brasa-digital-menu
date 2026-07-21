"use client";

import Link from "next/link";
import { useState } from "react";
import { CartItemRow } from "@/features/cart/components/cart-item-row";
import { formatMoney } from "@/features/menu/format-money";
import type { CartState } from "@/features/cart/types";

type CartSummaryProps = {
  cart: CartState;
  storeIsOpen?: boolean;
  /** Store-configured delivery minimum; presentation only — server remains source of truth. */
  minimumOrderAmountCents?: number;
  /** When false, do not show delivery-minimum copy (rule is irrelevant). */
  deliveryEnabled?: boolean;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
};

export function CartSummary({
  cart,
  storeIsOpen = true,
  minimumOrderAmountCents = 0,
  deliveryEnabled = false,
  onIncrease,
  onDecrease,
  onRemove,
}: CartSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  if (cart.items.length === 0) {
    return null;
  }

  const itemLabel =
    cart.totalQuantity === 1 ? "1 item" : `${cart.totalQuantity} itens`;

  const showMinimumOrderIndicator =
    deliveryEnabled && minimumOrderAmountCents > 0;

  return (
    <div
      data-testid="cart-summary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-500/30 bg-stone-950/98 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-100">
              {itemLabel} ·{" "}
              <span
                data-testid="cart-subtotal"
                className="tabular-nums text-orange-300"
              >
                {formatMoney(cart.subtotalCents)}
              </span>
            </p>
            {showMinimumOrderIndicator ? (
              <p
                data-testid="cart-minimum-order-indicator"
                role="status"
                aria-live="polite"
                className="mt-0.5 text-xs leading-snug text-stone-400"
              >
                Pedido mínimo para entrega:{" "}
                {formatMoney(minimumOrderAmountCents)}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              data-testid="cart-summary-toggle"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-600 px-3 text-sm font-semibold text-stone-100 hover:bg-stone-900"
            >
              {expanded ? "Ocultar" : "Ver pedido"}
            </button>
            {!storeIsOpen ? null : (
              <Link
                href="/na-brasa/checkout"
                data-testid="checkout-cta"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-bold text-stone-950 shadow-md shadow-orange-950/40"
              >
                Finalizar
              </Link>
            )}
          </div>
        </div>

        {expanded ? (
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onIncrease={(itemId) => onIncrease(itemId)}
                onDecrease={(itemId) => onDecrease(itemId)}
                onRemove={onRemove}
              />
            ))}
          </div>
        ) : null}

        {!storeIsOpen ? (
          <div
            data-testid="checkout-cta-closed"
            className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border border-amber-500/45 bg-amber-500/10 px-3 py-2.5 text-center"
            role="status"
          >
            <span className="text-sm font-semibold text-amber-100">
              Loja fechada — checkout indisponível
            </span>
            <span className="text-xs text-amber-100/80">
              Os itens ficam salvos aqui até a loja reabrir.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
