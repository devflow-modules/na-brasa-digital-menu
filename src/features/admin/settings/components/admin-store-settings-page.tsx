import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { LogoutButton } from "@/features/admin/auth/components/logout-button";
import {
  canToggleStoreOpen,
  canUpdateStoreSettings,
  formatAdminRoleLabel,
} from "@/features/admin/auth/admin-permissions";
import type { AdminStoreSettings } from "@/features/admin/settings/admin-store-settings.types";
import { StoreOpenToggle } from "@/features/admin/settings/components/store-open-toggle";
import { StoreSettingsForm } from "@/features/admin/settings/components/store-settings-form";

type AdminStoreSettingsPageProps = {
  storeName: string;
  sessionEmail: string;
  role: UserRole;
  isMasterTransitional: boolean;
  settings: AdminStoreSettings;
};

export function AdminStoreSettingsPage({
  storeName,
  sessionEmail,
  role,
  isMasterTransitional,
  settings,
}: AdminStoreSettingsPageProps) {
  const canUpdate = canUpdateStoreSettings(role);
  const canToggle = canToggleStoreOpen(role);

  return (
    <div
      data-testid="admin-store-settings-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-300/80">
            Configurações · Store-scoped
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-orange-50 sm:text-3xl">
            Configurações da loja
          </h1>
          <p className="mt-1 text-sm text-stone-400">{storeName}</p>
          <p
            data-testid="admin-store-settings-role-note"
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
            data-testid="admin-store-settings-back"
            className="text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
          >
            Voltar aos pedidos
          </Link>
          <LogoutButton className="border-stone-700 bg-stone-900 text-stone-100 hover:bg-stone-800" />
        </div>
      </header>

      {!canUpdate ? (
        <StoreOpenToggle isOpen={settings.isOpen} canToggle={canToggle} />
      ) : null}

      <StoreSettingsForm settings={settings} canSubmit={canUpdate} />

      {canUpdate ? (
        <p className="text-xs text-stone-500">
          Alterações refletem no cardápio público e no checkout após salvar.
        </p>
      ) : null}
    </div>
  );
}
