"use client";

import { formatMoney } from "@/features/menu/format-money";
import type { PublicMenuProduct } from "@/features/menu/menu.types";

type ProductCardProps = {
  product: PublicMenuProduct;
  onAdd?: (product: PublicMenuProduct) => void;
};

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const canAdd = product.available && Boolean(onAdd);

  return (
    <article
      data-testid="menu-product-card"
      data-product-available={product.available ? "true" : "false"}
      className="flex gap-3 rounded-xl border border-stone-800 bg-stone-900/80 p-3 shadow-sm shadow-black/20"
    >
      <div
        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-stone-800 to-orange-950/60 text-[10px] font-semibold uppercase tracking-wide text-orange-200/70"
        aria-hidden="true"
      >
        {product.imageUrl ? "Foto" : "Sem foto"}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug text-stone-50">
            {product.name}
          </h3>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {!product.available ? (
              <span
                data-testid="menu-product-unavailable-badge"
                className="rounded-full bg-stone-700/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-300 ring-1 ring-stone-600/50"
              >
                Indisponível no momento
              </span>
            ) : null}
            {product.featured ? (
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-300 ring-1 ring-orange-400/30">
                Destaque
              </span>
            ) : null}
          </div>
        </div>

        {product.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-stone-400">
            {product.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <p className="text-sm font-semibold text-orange-300">
            {formatMoney(product.priceCents)}
          </p>
          {onAdd ? (
            <button
              type="button"
              data-testid="open-add-to-cart-button"
              disabled={!canAdd}
              onClick={() => {
                if (!product.available) return;
                onAdd(product);
              }}
              className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-stone-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
            >
              Adicionar
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
