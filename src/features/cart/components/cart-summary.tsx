"use client";

import Link from "next/link";
import { CartItemRow } from "@/features/cart/components/cart-item-row";
import { formatMoney } from "@/features/menu/format-money";
import type { CartState } from "@/features/cart/types";

type CartSummaryProps = {
  cart: CartState;
  storeIsOpen?: boolean;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
};

export function CartSummary({
  cart,
  storeIsOpen = true,
  onIncrease,
  onDecrease,
  onRemove,
}: CartSummaryProps) {
  if (cart.items.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="cart-summary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-500/20 bg-stone-950/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">
              Seu carrinho
            </p>
            <p className="text-sm text-stone-200">
              {cart.totalQuantity}{" "}
              {cart.totalQuantity === 1 ? "item" : "itens"}
            </p>
          </div>
          <p
            data-testid="cart-subtotal"
            className="text-lg font-semibold text-orange-300"
          >
            {formatMoney(cart.subtotalCents)}
          </p>
        </div>

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
          <p
            data-testid="checkout-cta-closed"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-sm font-medium text-amber-100"
          >
            Loja fechada — checkout indisponível
          </p>
        ) : (
          <Link
            href="/na-brasa/checkout"
            data-testid="checkout-cta"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-stone-950"
          >
            Continuar para checkout
          </Link>
        )}
      </div>
    </div>
  );
}
