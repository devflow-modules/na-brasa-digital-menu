import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  canReadMenu,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
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
    notFound();
  }

  const catalog = await getAdminMenuCatalog(context.storeId);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <AdminMenuPage
        storeName={context.storeName}
        sessionEmail={context.session.email}
        role={context.role}
        isMasterTransitional={context.isMaster}
        catalog={catalog}
      />
    </main>
  );
}
