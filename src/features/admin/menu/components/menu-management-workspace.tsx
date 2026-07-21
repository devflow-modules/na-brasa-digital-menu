"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { UserRole } from "@prisma/client";
import {
  canCreateMenuProduct,
  canManageMenuCategories,
  canReadMenuAddons,
  canToggleProductActive,
  canToggleProductAvailability,
  canUpdateMenuProduct,
  formatAdminRoleLabel,
} from "@/features/admin/auth/admin-permissions";
import { toggleProductActiveAction } from "@/features/admin/menu/actions/toggle-product-active-action";
import { toggleProductAvailabilityAction } from "@/features/admin/menu/actions/toggle-product-availability-action";
import { formatAdminPriceCents } from "@/features/admin/menu/admin-menu-formatters";
import type { AdminMenuCatalog } from "@/features/admin/menu/admin-menu.types";
import { CategoryForm } from "@/features/admin/menu/components/category-form";
import { ProductForm } from "@/features/admin/menu/components/product-form";

type MenuManagementWorkspaceProps = {
  role: UserRole;
  catalog: AdminMenuCatalog;
};

export function MenuManagementWorkspace({
  role,
  catalog,
}: MenuManagementWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canManageCategories = canManageMenuCategories(role);
  const canCreateProduct = canCreateMenuProduct(role);
  const canUpdateProduct = canUpdateMenuProduct(role);
  const canToggleAvailability = canToggleProductAvailability(role);
  const canToggleActive = canToggleProductActive(role);
  const showAddonsLink = canReadMenuAddons(role);
  const defaultCategoryId = catalog.categories[0]?.id;

  const [openCategoryId, setOpenCategoryId] = useState<string | null>(
    catalog.categories[0]?.id ?? null,
  );

  function toggleCategory(categoryId: string) {
    setOpenCategoryId((current) =>
      current === categoryId ? current : categoryId,
    );
  }

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

  return (
    <div
      data-testid="admin-menu-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-orange-50 sm:text-3xl">
            Gerenciar cardápio
          </h1>
          <p
            data-testid="admin-menu-role-note"
            className="mt-2 text-sm text-stone-400"
          >
            Produtos e categorias da loja.
          </p>
        </div>
        {showAddonsLink ? (
          <Link
            href="/admin/cardapio/adicionais"
            data-testid="admin-menu-addons-link"
            className="text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
          >
            Gerenciar adicionais
          </Link>
        ) : null}
      </div>

      {canManageCategories ? (
        <CategoryForm mode="create" canManage={canManageCategories} />
      ) : null}

      {canCreateProduct ? (
        <ProductForm
          mode="create"
          categories={catalog.categories}
          defaultCategoryId={defaultCategoryId}
          canSubmit={canCreateProduct}
        />
      ) : null}

      {catalog.categories.length === 0 ? (
        <p
          data-testid="admin-menu-empty"
          className="rounded-2xl border border-dashed border-stone-700 px-5 py-8 text-center text-sm text-stone-400"
        >
          Nenhuma categoria cadastrada para esta loja.
        </p>
      ) : (
        <div className="flex flex-col gap-3" data-testid="admin-menu-product-list">
          {catalog.categories.map((category) => {
            const isOpen = openCategoryId === category.id;
            return (
              <section
                key={category.id}
                data-testid={`admin-menu-category-${category.id}`}
                data-open={isOpen ? "true" : "false"}
                className="rounded-2xl border border-stone-800 bg-stone-900/50"
              >
                <button
                  type="button"
                  data-testid={`admin-menu-category-toggle-${category.id}`}
                  aria-expanded={isOpen}
                  onClick={() => toggleCategory(category.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span>
                    <span className="mr-2 text-stone-500" aria-hidden>
                      {isOpen ? "▼" : "▶"}
                    </span>
                    <span className="text-lg font-semibold text-orange-50">
                      {category.name}
                    </span>
                    <span className="mt-1 block text-xs text-stone-500">
                      {category.active ? "Categoria ativa" : "Categoria inativa"}{" "}
                      · ordem {category.sortOrder}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-stone-400">
                    {category.products.length}{" "}
                    {category.products.length === 1 ? "produto" : "produtos"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="space-y-3 border-t border-stone-800 px-4 py-4">
                    {canManageCategories ? (
                      <CategoryForm
                        mode="edit"
                        category={category}
                        canManage={canManageCategories}
                      />
                    ) : null}

                    <ul className="flex flex-col gap-3">
                      {category.products.length === 0 ? (
                        <li className="text-sm text-stone-500">
                          Sem produtos nesta categoria.
                        </li>
                      ) : (
                        category.products.map((product) => (
                          <li
                            key={product.id}
                            data-testid={`admin-menu-product-${product.id}`}
                            className="rounded-xl border border-stone-800 bg-stone-950/60 p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-stone-100">
                                  {product.name}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-orange-200">
                                  {formatAdminPriceCents(product.priceCents)}
                                </p>
                                <p
                                  data-testid={`admin-menu-product-publication-${product.id}`}
                                  className="mt-2 text-xs text-stone-500"
                                >
                                  {product.active
                                    ? "Publicado"
                                    : "Oculto / inativo"}
                                </p>
                                <p
                                  data-testid={`admin-menu-product-availability-${product.id}`}
                                  className="mt-1 text-xs text-stone-500"
                                >
                                  {product.available
                                    ? "Disponível"
                                    : "Indisponível"}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2">
                                {canToggleAvailability ? (
                                  <button
                                    type="button"
                                    data-testid={`admin-menu-toggle-availability-${product.id}`}
                                    disabled={isPending}
                                    onClick={() =>
                                      toggleAvailability(
                                        product.id,
                                        !product.available,
                                      )
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
                                    onClick={() =>
                                      toggleActive(product.id, !product.active)
                                    }
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
                                  categories={catalog.categories}
                                  product={product}
                                  canSubmit={canUpdateProduct}
                                />
                              </div>
                            ) : null}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <p className="text-xs text-stone-500">
        Perfil: {formatAdminRoleLabel(role)}
      </p>
    </div>
  );
}
