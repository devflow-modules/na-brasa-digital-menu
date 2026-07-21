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
          Status operacional e dados permanentes do cardápio e do checkout.
        </p>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="settings-status">
        <div>
          <h2
            id="settings-status"
            className="text-sm font-semibold text-orange-50"
          >
            Status da operação
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            Controla se novos pedidos online são aceitos agora. É independente
            das configurações permanentes abaixo.
          </p>
        </div>
        <StoreOpenToggle isOpen={settings.isOpen} canToggle={canToggle} />
      </section>

      <StoreSettingsForm settings={settings} canSubmit={canUpdate} />

      {canUpdate ? (
        <p className="text-xs text-stone-500">
          Alterações permanentes refletem no cardápio público e no checkout após
          salvar. Abrir ou fechar a loja é imediato.
        </p>
      ) : null}
    </div>
  );
}
