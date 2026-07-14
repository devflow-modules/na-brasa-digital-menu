"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/features/menu/format-money";
import type { CartAddon } from "@/features/cart/types";
import type { PublicMenuProduct } from "@/features/menu/menu.types";

type AddToCartPanelProps = {
  product: PublicMenuProduct;
  onClose: () => void;
  onConfirm: (payload: {
    quantity: number;
    selectedAddons: CartAddon[];
  }) => void;
};

export function AddToCartPanel({
  product,
  onClose,
  onConfirm,
}: AddToCartPanelProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const selectedAddons = useMemo(
    () =>
      product.addons.filter((addon) => selectedAddonIds.includes(addon.id)),
    [product.addons, selectedAddonIds],
  );

  const previewTotal = useMemo(() => {
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.priceCents,
      0,
    );
    return (product.priceCents + addonsTotal) * quantity;
  }, [product.priceCents, selectedAddons, quantity]);

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((current) =>
      current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId],
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-cart-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-2xl border border-stone-700 bg-stone-950 p-4 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="add-to-cart-title"
              className="text-lg font-semibold text-orange-50"
            >
              {product.name}
            </h2>
            <p className="mt-1 text-sm text-orange-300">
              {formatMoney(product.priceCents)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-stone-400 hover:text-stone-100"
          >
            Fechar
          </button>
        </div>

        {product.description ? (
          <p className="text-sm text-stone-400">{product.description}</p>
        ) : null}

        {product.addons.length > 0 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-stone-200">
              Adicionais
            </legend>
            <ul className="flex flex-col gap-2">
              {product.addons.map((addon) => {
                const checked = selectedAddonIds.includes(addon.id);
                return (
                  <li key={addon.id}>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-3">
                      <span className="flex items-center gap-3 text-sm text-stone-100">
                        <input
                          type="checkbox"
                          data-testid={`menu-addon-option-${addon.id}`}
                          checked={checked}
                          onChange={() => toggleAddon(addon.id)}
                          className="h-4 w-4 accent-orange-500"
                        />
                        {addon.name}
                      </span>
                      <span className="text-sm text-orange-300">
                        + {formatMoney(addon.priceCents)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-stone-300">Quantidade</p>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-800 text-lg ring-1 ring-stone-700"
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <span className="min-w-6 text-center text-sm font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(99, value + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-800 text-lg ring-1 ring-stone-700"
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          data-testid="add-to-cart-button"
          onClick={() =>
            onConfirm({
              quantity,
              selectedAddons,
            })
          }
          className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-stone-950"
        >
          Adicionar ao carrinho · {formatMoney(previewTotal)}
        </button>
      </div>
    </div>
  );
}
