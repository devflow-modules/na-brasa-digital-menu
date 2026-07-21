"use client";

import Link from "next/link";
import { useState } from "react";
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
import type { AdminMenuCatalog } from "@/features/admin/menu/admin-menu.types";
import { CategoryForm } from "@/features/admin/menu/components/category-form";
import { MenuProductRow } from "@/features/admin/menu/components/menu-product-row";
import { ProductForm } from "@/features/admin/menu/components/product-form";

type MenuManagementWorkspaceProps = {
  role: UserRole;
  catalog: AdminMenuCatalog;
};

export function MenuManagementWorkspace({
  role,
  catalog,
}: MenuManagementWorkspaceProps) {
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

                    {category.products.length === 0 ? (
                      <p className="text-sm text-stone-500">
                        Sem produtos nesta categoria.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {category.products.map((product) => (
                          <MenuProductRow
                            key={product.id}
                            product={product}
                            categories={catalog.categories}
                            canUpdateProduct={canUpdateProduct}
                            canToggleAvailability={canToggleAvailability}
                            canToggleActive={canToggleActive}
                          />
                        ))}
                      </ul>
                    )}
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
