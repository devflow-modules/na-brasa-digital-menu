import type { UserRole } from "@prisma/client";
import {
  canToggleStoreOpen,
  canUpdateStoreSettings,
} from "@/features/admin/auth/admin-permissions";
import type { AdminStoreSettings } from "@/features/admin/settings/admin-store-settings.types";
import { StoreOpenToggle } from "@/features/admin/settings/components/store-open-toggle";
import { StoreSettingsForm } from "@/features/admin/settings/components/store-settings-form";

type AdminStoreSettingsPageProps = {
  role: UserRole;
  settings: AdminStoreSettings;
};

export function AdminStoreSettingsPage({
  role,
  settings,
}: AdminStoreSettingsPageProps) {
  const canUpdate = canUpdateStoreSettings(role);
  const canToggle = canToggleStoreOpen(role);

  return (
    <div
      data-testid="admin-store-settings-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <div>
        <h1 className="text-2xl font-semibold text-orange-50 sm:text-3xl">
          Configurações da loja
        </h1>
        <p
          data-testid="admin-store-settings-role-note"
          className="mt-2 text-sm text-stone-400"
        >
          Dados operacionais exibidos no cardápio e no checkout.
        </p>
      </div>

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
