"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import {
  countMenuCatalog,
  filterMenuCatalog,
  type MenuStatusFilter,
} from "@/features/admin/menu/menu-catalog-filters";
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

  const counters = useMemo(
    () => countMenuCatalog(catalog.categories),
    [catalog.categories],
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MenuStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [openCategoryIds, setOpenCategoryIds] = useState<string[]>([]);

  const filteredCategories = useMemo(
    () =>
      filterMenuCatalog(catalog.categories, {
        search,
        status: statusFilter,
        categoryId: categoryFilter,
      }),
    [catalog.categories, search, statusFilter, categoryFilter],
  );

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    categoryFilter.length > 0;
  const searchActive = search.trim().length > 0;

  useEffect(() => {
    if (catalog.categories.length === 0) {
      setOpenCategoryIds([]);
      return;
    }

    if (searchActive || statusFilter !== "all") {
      setOpenCategoryIds(filteredCategories.map((category) => category.id));
      return;
    }

    if (categoryFilter) {
      setOpenCategoryIds([categoryFilter]);
      return;
    }

    setOpenCategoryIds((current) => {
      if (
        current.length === 1 &&
        catalog.categories.some((category) => category.id === current[0])
      ) {
        return current;
      }
      return catalog.categories[0] ? [catalog.categories[0].id] : [];
    });
  }, [
    catalog.categories,
    categoryFilter,
    filteredCategories,
    searchActive,
    statusFilter,
  ]);

  function toggleCategory(categoryId: string) {
    setOpenCategoryIds((current) => {
      if (current.includes(categoryId) && current.length === 1 && !searchActive) {
        return current;
      }
      if (searchActive || statusFilter !== "all") {
        return current.includes(categoryId)
          ? current.filter((id) => id !== categoryId)
          : [...current, categoryId];
      }
      return current.includes(categoryId) ? [] : [categoryId];
    });
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("");
  }

  const defaultCategoryId =
    categoryFilter || catalog.categories[0]?.id || undefined;

  return (
    <div
      data-testid="admin-menu-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6"
    >
      <header className="sticky top-0 z-20 -mx-4 space-y-3 border-b border-stone-800/80 bg-stone-950/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-orange-50 sm:text-3xl">
              Gerenciar cardápio
            </h1>
            <p
              data-testid="admin-menu-role-note"
              className="mt-1 text-sm text-stone-400"
            >
              Produtos e categorias da loja.
            </p>
            <p
              data-testid="admin-menu-counters"
              className="mt-2 text-sm text-stone-300"
            >
              {counters.totalProducts} produtos · {counters.activeProducts}{" "}
              ativos · {counters.unavailableProducts} indisponíveis
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

        <div
          data-testid="admin-menu-filters"
          className="grid gap-2 sm:grid-cols-3"
        >
          <label className="block text-xs text-stone-400">
            Buscar produto
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome do produto"
              data-testid="admin-menu-search"
              className="mt-1 h-10 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
            />
          </label>
          <label className="block text-xs text-stone-400">
            Categoria
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              data-testid="admin-menu-filter-category"
              className="mt-1 h-10 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
            >
              <option value="">Todas categorias</option>
              {catalog.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-stone-400">
            Status
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as MenuStatusFilter)
              }
              data-testid="admin-menu-filter-status"
              className="mt-1 h-10 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="available">Disponíveis</option>
              <option value="unavailable">Indisponíveis</option>
            </select>
          </label>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            data-testid="admin-menu-clear-filters"
            onClick={clearFilters}
            className="text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
          >
            Limpar busca e filtros
          </button>
        ) : null}
      </header>

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
          Comece criando sua primeira categoria e produto.
        </p>
      ) : filteredCategories.length === 0 ? (
        <div
          data-testid="admin-menu-no-results"
          className="rounded-2xl border border-dashed border-stone-700 px-5 py-8 text-center"
        >
          <p className="text-sm text-stone-300">
            {search.trim()
              ? `Nenhum produto encontrado para “${search.trim()}”.`
              : "Nenhum produto corresponde aos filtros."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-testid="admin-menu-product-list">
          {filteredCategories.map((category) => {
            const isOpen = openCategoryIds.includes(category.id);
            const productCount = category.products.length;

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
                  <span
                    data-testid={`admin-menu-category-count-${category.id}`}
                    className="shrink-0 text-sm text-stone-400"
                  >
                    {productCount}{" "}
                    {productCount === 1 ? "produto" : "produtos"}
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

                    {productCount === 0 ? (
                      <p className="text-sm text-stone-500">
                        Esta categoria ainda não possui produtos.
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
