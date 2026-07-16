import type { Metadata } from "next";
import { canReadMenu } from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { AdminAccessDenied } from "@/features/admin/chrome/admin-access-denied";
import { getAdminMenuCatalog } from "@/features/admin/menu/admin-menu.repository";
import { AdminMenuPage } from "@/features/admin/menu/components/admin-menu-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cardápio — Admin",
  description: "Gerenciamento do cardápio da loja.",
};

export default async function AdminMenuRoutePage() {
  const context = await requireAdminStoreContext();

  if (!canReadMenu(context.role)) {
    return (
      <main>
        <AdminAccessDenied role={context.role} />
      </main>
    );
  }

  const catalog = await getAdminMenuCatalog(context.storeId);

  return (
    <main>
      <AdminMenuPage role={context.role} catalog={catalog} />
    </main>
  );
}
