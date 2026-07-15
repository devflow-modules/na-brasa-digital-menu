"use client";

import Link from "next/link";
import { CartItemRow } from "@/features/cart/components/cart-item-row";
import { formatMoney } from "@/features/menu/format-money";
import type { CartState } from "@/features/cart/types";

type CartSummaryProps = {
  cart: CartState;
  storeIsOpen?: boolean;
  /** Store-configured minimum; presentation only — server remains source of truth. */
  minimumOrderAmountCents?: number;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
};

export function CartSummary({
  cart,
  storeIsOpen = true,
  minimumOrderAmountCents = 0,
  onIncrease,
  onDecrease,
  onRemove,
}: CartSummaryProps) {
  if (cart.items.length === 0) {
    return null;
  }

  const itemLabel =
    cart.totalQuantity === 1 ? "1 item" : `${cart.totalQuantity} itens`;

  // Same base as create-order.service: subtotal of products+addons vs store minimum.
  const remainingMinimumCents =
    minimumOrderAmountCents > 0
      ? Math.max(minimumOrderAmountCents - cart.subtotalCents, 0)
      : 0;
  const showMinimumOrderIndicator = minimumOrderAmountCents > 0;

  return (
    <div
      data-testid="cart-summary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-500/30 bg-stone-950/98 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-300/90">
              Seu pedido
            </p>
            <p className="text-sm text-stone-300">{itemLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
              Total estimado
            </p>
            <p
              data-testid="cart-subtotal"
              className="text-xl font-bold tabular-nums text-orange-300"
            >
              {formatMoney(cart.subtotalCents)}
            </p>
          </div>
        </div>

        {showMinimumOrderIndicator ? (
          <p
            data-testid="cart-minimum-order-indicator"
            role="status"
            aria-live="polite"
            className={`text-xs leading-snug ${
              remainingMinimumCents > 0
                ? "font-medium text-amber-100"
                : "text-stone-400"
            }`}
          >
            {remainingMinimumCents > 0
              ? `Faltam ${formatMoney(remainingMinimumCents)} para atingir o pedido mínimo de ${formatMoney(minimumOrderAmountCents)}.`
              : "Pedido mínimo atingido."}
          </p>
        ) : null}

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

        {!storeIsOpen ? (
          <div
            data-testid="checkout-cta-closed"
            className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border border-amber-500/45 bg-amber-500/10 px-3 py-2.5 text-center"
            role="status"
          >
            <span className="text-sm font-semibold text-amber-100">
              Loja fechada — checkout indisponível
            </span>
            <span className="text-xs text-amber-100/80">
              Os itens ficam salvos aqui até a loja reabrir.
            </span>
          </div>
        ) : (
          <Link
            href="/na-brasa/checkout"
            data-testid="checkout-cta"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-stone-950 shadow-md shadow-orange-950/40 ring-1 ring-orange-400/30"
          >
            Continuar para checkout
          </Link>
        )}
      </div>
    </div>
  );
}
