"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { UserRole } from "@prisma/client";
import {
  canToggleProductActive,
  canToggleProductAvailability,
  formatAdminRoleLabel,
} from "@/features/admin/auth/admin-permissions";
import { toggleProductActiveAction } from "@/features/admin/menu/actions/toggle-product-active-action";
import { toggleProductAvailabilityAction } from "@/features/admin/menu/actions/toggle-product-availability-action";
import { formatAdminPriceCents } from "@/features/admin/menu/admin-menu-formatters";
import type { AdminMenuCategory } from "@/features/admin/menu/admin-menu.types";
import { CategoryForm } from "@/features/admin/menu/components/category-form";
import { ProductForm } from "@/features/admin/menu/components/product-form";

type ProductListProps = {
  categories: AdminMenuCategory[];
  role: UserRole;
  canManageCategories: boolean;
  canUpdateProduct: boolean;
};

export function ProductList({
  categories,
  role,
  canManageCategories,
  canUpdateProduct,
}: ProductListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canToggleAvailability = canToggleProductAvailability(role);
  const canToggleActive = canToggleProductActive(role);

  function toggleAvailability(productId: string, available: boolean) {
    startTransition(async () => {
      const result = await toggleProductAvailabilityAction({
        productId,
        available,
      });
      if (result.ok) {
        router.refresh();
      }
    });
  }

  function toggleActive(productId: string, active: boolean) {
    startTransition(async () => {
      const result = await toggleProductActiveAction({ productId, active });
      if (result.ok) {
        router.refresh();
      }
    });
  }

  if (categories.length === 0) {
    return (
      <p
        data-testid="admin-menu-empty"
        className="rounded-2xl border border-dashed border-stone-700 px-5 py-8 text-center text-sm text-stone-400"
      >
        Nenhuma categoria cadastrada para esta loja.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-menu-product-list">
      {categories.map((category) => (
        <section
          key={category.id}
          data-testid={`admin-menu-category-${category.id}`}
          className="rounded-2xl border border-stone-800 bg-stone-900/50 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-orange-50">
                {category.name}
              </h3>
              <p className="mt-1 text-xs text-stone-500">
                {category.active ? "Categoria ativa" : "Categoria inativa"} · ordem{" "}
                {category.sortOrder}
              </p>
            </div>
          </div>

          {canManageCategories ? (
            <div className="mt-4">
              <CategoryForm
                mode="edit"
                category={category}
                canManage={canManageCategories}
              />
            </div>
          ) : null}

          <ul className="mt-4 flex flex-col gap-3">
            {category.products.length === 0 ? (
              <li className="text-sm text-stone-500">Sem produtos nesta categoria.</li>
            ) : (
              category.products.map((product) => (
                <li
                  key={product.id}
                  data-testid={`admin-menu-product-${product.id}`}
                  className="rounded-xl border border-stone-800 bg-stone-950/60 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-100">{product.name}</p>
                      {product.description ? (
                        <p className="mt-1 text-xs text-stone-400">
                          {product.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm font-semibold text-orange-200">
                        {formatAdminPriceCents(product.priceCents)}
                      </p>
                      <p
                        data-testid={`admin-menu-product-publication-${product.id}`}
                        className="mt-2 text-xs text-stone-500"
                      >
                        {product.active ? "Publicado" : "Oculto / inativo"}
                      </p>
                      <p
                        data-testid={`admin-menu-product-availability-${product.id}`}
                        className="mt-1 text-xs text-stone-500"
                      >
                        {product.available ? "Disponível" : "Indisponível"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {canToggleAvailability ? (
                        <button
                          type="button"
                          data-testid={`admin-menu-toggle-availability-${product.id}`}
                          disabled={isPending}
                          onClick={() =>
                            toggleAvailability(product.id, !product.available)
                          }
                          className="h-9 rounded-lg border border-stone-700 px-3 text-xs font-medium text-stone-200 disabled:opacity-60"
                        >
                          {product.available
                            ? "Marcar indisponível"
                            : "Marcar disponível"}
                        </button>
                      ) : null}
                      {canToggleActive ? (
                        <button
                          type="button"
                          data-testid={`admin-menu-toggle-active-${product.id}`}
                          disabled={isPending}
                          onClick={() => toggleActive(product.id, !product.active)}
                          className="h-9 rounded-lg border border-amber-500/40 px-3 text-xs font-medium text-amber-100 disabled:opacity-60"
                        >
                          {product.active
                            ? "Ocultar do cardápio"
                            : "Publicar no cardápio"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {canUpdateProduct ? (
                    <div className="mt-4 border-t border-stone-800 pt-4">
                      <ProductForm
                        mode="edit"
                        categories={categories}
                        product={product}
                        canSubmit={canUpdateProduct}
                      />
                    </div>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>
      ))}
      <p className="text-xs text-stone-500">
        Perfil: {formatAdminRoleLabel(role)}
      </p>
    </div>
  );
}
