"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleProductActiveAction } from "@/features/admin/menu/actions/toggle-product-active-action";
import { toggleProductAvailabilityAction } from "@/features/admin/menu/actions/toggle-product-availability-action";
import { formatAdminPriceCents } from "@/features/admin/menu/admin-menu-formatters";
import type {
  AdminMenuCategory,
  AdminMenuProduct,
} from "@/features/admin/menu/admin-menu.types";
import { ProductAddonGroupsPanel } from "@/features/admin/addon-groups/components/product-addon-groups-panel";
import { ProductForm } from "@/features/admin/menu/components/product-form";

type MenuProductRowProps = {
  product: AdminMenuProduct;
  categories: AdminMenuCategory[];
  canUpdateProduct: boolean;
  canToggleAvailability: boolean;
  canToggleActive: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
};

export function MenuProductRow({
  product,
  categories,
  canUpdateProduct,
  canToggleAvailability,
  canToggleActive,
  isEditing,
  onEdit,
  onCancelEdit,
}: MenuProductRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggleAvailability() {
    startTransition(async () => {
      const result = await toggleProductAvailabilityAction({
        productId: product.id,
        available: !product.available,
      });
      if (result.ok) {
        router.refresh();
      }
    });
  }

  function toggleActive() {
    startTransition(async () => {
      const result = await toggleProductActiveAction({
        productId: product.id,
        active: !product.active,
      });
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <li
      data-testid={`admin-menu-product-${product.id}`}
      className="rounded-xl border border-stone-800 bg-stone-950/60 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-stone-100">{product.name}</p>
          <p className="mt-1 text-sm font-semibold text-orange-200">
            {formatAdminPriceCents(product.priceCents)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span
              data-testid={`admin-menu-product-publication-${product.id}`}
              className={
                product.active
                  ? "rounded-md bg-emerald-950/50 px-2 py-0.5 text-emerald-200"
                  : "rounded-md bg-stone-800 px-2 py-0.5 text-stone-400"
              }
            >
              {product.active ? "Publicado" : "Oculto / inativo"}
            </span>
            <span
              data-testid={`admin-menu-product-availability-${product.id}`}
              className={
                product.available
                  ? "rounded-md bg-stone-800 px-2 py-0.5 text-stone-300"
                  : "rounded-md bg-amber-950/50 px-2 py-0.5 text-amber-200"
              }
            >
              {product.available ? "Disponível" : "Indisponível"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canUpdateProduct ? (
            <button
              type="button"
              data-testid={`admin-menu-edit-product-${product.id}`}
              disabled={isEditing}
              onClick={onEdit}
              className="h-9 rounded-lg border border-orange-500/50 px-3 text-xs font-medium text-orange-100 disabled:opacity-60"
            >
              Editar
            </button>
          ) : null}
          {canToggleAvailability ? (
            <button
              type="button"
              data-testid={`admin-menu-toggle-availability-${product.id}`}
              disabled={isPending}
              onClick={toggleAvailability}
              className="h-9 rounded-lg border border-stone-700 px-3 text-xs font-medium text-stone-200 disabled:opacity-60"
            >
              {product.available ? "Marcar indisponível" : "Marcar disponível"}
            </button>
          ) : null}
          {canToggleActive ? (
            <button
              type="button"
              data-testid={`admin-menu-toggle-active-${product.id}`}
              disabled={isPending}
              onClick={toggleActive}
              className="h-9 rounded-lg border border-amber-500/40 px-3 text-xs font-medium text-amber-100 disabled:opacity-60"
            >
              {product.active ? "Ocultar do cardápio" : "Publicar no cardápio"}
            </button>
          ) : null}
        </div>
      </div>

      {isEditing && canUpdateProduct ? (
        <div className="mt-4 border-t border-stone-800 pt-4">
          <ProductForm
            mode="edit"
            categories={categories}
            product={product}
            canSubmit={canUpdateProduct}
            onCancel={onCancelEdit}
          />
          <ProductAddonGroupsPanel
            productId={product.id}
            canManage={canUpdateProduct}
          />
        </div>
      ) : null}
    </li>
  );
}
