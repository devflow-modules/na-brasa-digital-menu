"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/features/menu/format-money";
import { ProductMenuThumbnail } from "@/features/menu/components/product-menu-thumbnail";
import type { PublicMenuProduct } from "@/features/menu/menu.types";

type ProductCardProps = {
  product: PublicMenuProduct;
  onAdd?: (product: PublicMenuProduct) => void;
  /** Total quantity already in the cart for this product (any addon combo). */
  cartQuantity?: number;
};

export function ProductCard({
  product,
  onAdd,
  cartQuantity = 0,
}: ProductCardProps) {
  const canAdd = product.available && Boolean(onAdd);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (cartQuantity <= 0) {
      setJustAdded(false);
      return;
    }
    setJustAdded(true);
    const timer = window.setTimeout(() => setJustAdded(false), 1600);
    return () => window.clearTimeout(timer);
  }, [cartQuantity]);

  return (
    <article
      data-testid="menu-product-card"
      data-product-available={product.available ? "true" : "false"}
      className={`flex gap-3 rounded-2xl border p-3.5 shadow-sm shadow-black/25 transition-colors ${
        product.available
          ? "border-stone-700/80 bg-stone-900/90"
          : "border-stone-800/60 bg-stone-950/80 opacity-75"
      }`}
    >
      <ProductMenuThumbnail
        name={product.name}
        imageUrl={product.imageUrl}
        available={product.available}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`text-base font-semibold leading-snug ${
              product.available ? "text-stone-50" : "text-stone-400"
            }`}
          >
            {product.name}
          </h3>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {!product.available ? (
              <span
                data-testid="menu-product-unavailable-badge"
                className="rounded-full bg-stone-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-200 ring-1 ring-stone-500"
              >
                Indisponível
              </span>
            ) : null}
            {product.featured && product.available ? (
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-200 ring-1 ring-orange-400/35">
                Destaque
              </span>
            ) : null}
          </div>
        </div>

        {product.description ? (
          <p
            className={`line-clamp-2 text-sm leading-relaxed ${
              product.available ? "text-stone-400" : "text-stone-500"
            }`}
          >
            {product.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-0.5">
          <p
            className={`text-base font-bold tabular-nums ${
              product.available ? "text-orange-300" : "text-stone-500"
            }`}
          >
            {formatMoney(product.priceCents)}
          </p>
          {onAdd ? (
            <div className="flex flex-col items-end gap-1">
              {justAdded || cartQuantity > 0 ? (
                <span
                  data-testid="menu-product-added-feedback"
                  className="text-[11px] font-medium text-emerald-300"
                  aria-live="polite"
                >
                  {justAdded
                    ? "Adicionado ao pedido"
                    : `${cartQuantity} no pedido`}
                </span>
              ) : null}
              <button
                type="button"
                data-testid="open-add-to-cart-button"
                disabled={!canAdd}
                aria-disabled={!canAdd}
                onClick={() => {
                  if (!product.available) return;
                  onAdd(product);
                }}
                className="min-h-10 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-stone-950 shadow-sm shadow-orange-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500 disabled:shadow-none"
              >
                {product.available
                  ? cartQuantity > 0
                    ? "Adicionar mais"
                    : "Adicionar"
                  : "Indisponível"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
