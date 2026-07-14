import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { LogoutButton } from "@/features/admin/auth/components/logout-button";
import {
  canCreateMenuAddon,
  canReadMenuAddons,
  formatAdminRoleLabel,
} from "@/features/admin/auth/admin-permissions";
import type { AdminAddonsCatalog } from "@/features/admin/addons/admin-addons.types";
import { AddonForm } from "@/features/admin/addons/components/addon-form";
import { AddonList } from "@/features/admin/addons/components/addon-list";

type AdminAddonsPageProps = {
  storeName: string;
  sessionEmail: string;
  role: UserRole;
  isMasterTransitional: boolean;
  catalog: AdminAddonsCatalog;
};

export function AdminAddonsPage({
  storeName,
  sessionEmail,
  role,
  isMasterTransitional,
  catalog,
}: AdminAddonsPageProps) {
  const canCreate = canCreateMenuAddon(role);

  return (
    <div
      data-testid="admin-addons-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-300/80">
            Cardápio · Adicionais
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-orange-50 sm:text-3xl">
            Adicionais
          </h1>
          <p className="mt-1 text-sm text-stone-400">{storeName}</p>
          <p
            data-testid="admin-addons-role-note"
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
            href="/admin/cardapio"
            data-testid="admin-addons-back-to-menu"
            className="text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
          >
            Voltar ao cardápio
          </Link>
          <Link
            href="/admin"
            className="text-sm text-stone-400 underline-offset-2 hover:underline"
          >
            Pedidos
          </Link>
          <LogoutButton className="border-stone-700 bg-stone-900 text-stone-100 hover:bg-stone-800" />
        </div>
      </header>

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
