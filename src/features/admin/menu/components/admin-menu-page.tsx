import Link from "next/link";
import type { UserRole } from "@prisma/client";
import {
  canCreateMenuProduct,
  canManageMenuCategories,
  canReadMenuAddons,
  canUpdateMenuProduct,
} from "@/features/admin/auth/admin-permissions";
import type { AdminMenuCatalog } from "@/features/admin/menu/admin-menu.types";
import { CategoryForm } from "@/features/admin/menu/components/category-form";
import { ProductForm } from "@/features/admin/menu/components/product-form";
import { ProductList } from "@/features/admin/menu/components/product-list";

type AdminMenuPageProps = {
  role: UserRole;
  catalog: AdminMenuCatalog;
};

export function AdminMenuPage({ role, catalog }: AdminMenuPageProps) {
  const canManageCategories = canManageMenuCategories(role);
  const canCreateProduct = canCreateMenuProduct(role);
  const canUpdateProduct = canUpdateMenuProduct(role);
  const defaultCategoryId = catalog.categories[0]?.id;
  const showAddonsLink = canReadMenuAddons(role);

  return (
    <div
      data-testid="admin-menu-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-orange-50 sm:text-3xl">
            Cardápio
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

      <ProductList
        categories={catalog.categories}
        role={role}
        canManageCategories={canManageCategories}
        canUpdateProduct={canUpdateProduct}
      />
    </div>
  );
}
