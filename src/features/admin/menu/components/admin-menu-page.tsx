import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { LogoutButton } from "@/features/admin/auth/components/logout-button";
import {
  canCreateMenuProduct,
  canManageMenuCategories,
  canUpdateMenuProduct,
  formatAdminRoleLabel,
} from "@/features/admin/auth/admin-permissions";
import type { AdminMenuCatalog } from "@/features/admin/menu/admin-menu.types";
import { CategoryForm } from "@/features/admin/menu/components/category-form";
import { ProductForm } from "@/features/admin/menu/components/product-form";
import { ProductList } from "@/features/admin/menu/components/product-list";

type AdminMenuPageProps = {
  storeName: string;
  sessionEmail: string;
  role: UserRole;
  isMasterTransitional: boolean;
  catalog: AdminMenuCatalog;
};

export function AdminMenuPage({
  storeName,
  sessionEmail,
  role,
  isMasterTransitional,
  catalog,
}: AdminMenuPageProps) {
  const canManageCategories = canManageMenuCategories(role);
  const canCreateProduct = canCreateMenuProduct(role);
  const canUpdateProduct = canUpdateMenuProduct(role);
  const defaultCategoryId = catalog.categories[0]?.id;

  return (
    <div
      data-testid="admin-menu-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-300/80">
            Cardápio · Store-scoped
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-orange-50 sm:text-3xl">
            {storeName}
          </h1>
          <p
            data-testid="admin-menu-role-note"
            className="mt-2 text-sm text-stone-400"
          >
            Perfil: {formatAdminRoleLabel(role)} · {sessionEmail}
          </p>
          {isMasterTransitional ? (
            <p className="mt-2 text-xs text-amber-200/80">
              Acesso MASTER transicional ao /admin.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href="/admin"
            className="text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
          >
            Voltar para pedidos
          </Link>
          <LogoutButton className="border-stone-700 bg-stone-900 text-stone-100 hover:bg-stone-800" />
        </div>
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

      <ProductList
        categories={catalog.categories}
        role={role}
        canManageCategories={canManageCategories}
        canUpdateProduct={canUpdateProduct}
      />
    </div>
  );
}
