import type { Metadata } from "next";
import { canReadMenuAddons } from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { AdminAccessDenied } from "@/features/admin/chrome/admin-access-denied";
import { getAdminAddonsCatalog } from "@/features/admin/addons/admin-addons.repository";
import { AdminAddonsPage } from "@/features/admin/addons/components/admin-addons-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Adicionais — Admin",
  description: "Gerenciamento de adicionais da loja.",
};

export default async function AdminAddonsRoutePage() {
  const context = await requireAdminStoreContext();

  if (!canReadMenuAddons(context.role)) {
    return (
      <main>
        <AdminAccessDenied role={context.role} />
      </main>
    );
  }

  const catalog = await getAdminAddonsCatalog(context.storeId);

  return (
    <main>
      <AdminAddonsPage role={context.role} catalog={catalog} />
    </main>
  );
}
