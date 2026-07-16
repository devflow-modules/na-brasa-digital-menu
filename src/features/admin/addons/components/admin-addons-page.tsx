import Link from "next/link";
import type { UserRole } from "@prisma/client";
import {
  canCreateMenuAddon,
  canReadMenuAddons,
} from "@/features/admin/auth/admin-permissions";
import type { AdminAddonsCatalog } from "@/features/admin/addons/admin-addons.types";
import { AddonForm } from "@/features/admin/addons/components/addon-form";
import { AddonList } from "@/features/admin/addons/components/addon-list";

type AdminAddonsPageProps = {
  role: UserRole;
  catalog: AdminAddonsCatalog;
};

export function AdminAddonsPage({ role, catalog }: AdminAddonsPageProps) {
  const canCreate = canCreateMenuAddon(role);

  return (
    <div
      data-testid="admin-addons-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-orange-50 sm:text-3xl">
            Adicionais
          </h1>
          <p
            data-testid="admin-addons-role-note"
            className="mt-2 text-sm text-stone-400"
          >
            Adicionais do cardápio da loja.
          </p>
        </div>
        <Link
          href="/admin/cardapio"
          data-testid="admin-addons-back-to-menu"
          className="text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
        >
          Voltar ao cardápio
        </Link>
      </div>

      {canCreate ? <AddonForm mode="create" canSubmit={canCreate} /> : null}

      {canReadMenuAddons(role) ? (
        <AddonList
          addons={catalog.addons}
          products={catalog.products}
          role={role}
        />
      ) : null}
    </div>
  );
}
