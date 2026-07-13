"use client";

import { formatMoney } from "@/features/menu/format-money";
import type { CartItem } from "@/features/cart/types";

type CartItemRowProps = {
  item: CartItem;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
};

export function CartItemRow({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}: CartItemRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-stone-800 bg-stone-900/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-50">{item.productName}</p>
          {item.selectedAddons.length > 0 ? (
            <p className="mt-1 text-xs text-stone-400">
              {item.selectedAddons.map((addon) => addon.name).join(", ")}
            </p>
          ) : null}
        </div>
        <p className="shrink-0 text-sm font-semibold text-orange-300">
          {formatMoney(item.totalCents)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDecrease(item.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-800 text-lg text-stone-100 ring-1 ring-stone-700"
            aria-label={`Diminuir ${item.productName}`}
          >
            −
          </button>
          <span className="min-w-6 text-center text-sm font-semibold text-stone-100">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onIncrease(item.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-800 text-lg text-stone-100 ring-1 ring-stone-700"
            aria-label={`Aumentar ${item.productName}`}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="text-xs font-medium text-stone-400 underline-offset-2 hover:text-orange-300 hover:underline"
        >
          Remover
        </button>
      </div>
    </div>
  );
}
