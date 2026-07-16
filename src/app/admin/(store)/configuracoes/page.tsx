import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canReadStoreSettings } from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { getAdminStoreSettings } from "@/features/admin/settings/admin-store-settings.repository";
import { AdminStoreSettingsPage } from "@/features/admin/settings/components/admin-store-settings-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configurações — Admin",
  description: "Configurações operacionais da loja.",
};

export default async function AdminStoreSettingsRoutePage() {
  const context = await requireAdminStoreContext();

  if (!canReadStoreSettings(context.role)) {
    notFound();
  }

  const settings = await getAdminStoreSettings(context.storeId);
  if (!settings) {
    notFound();
  }

  return (
    <main>
      <AdminStoreSettingsPage role={context.role} settings={settings} />
    </main>
  );
}
