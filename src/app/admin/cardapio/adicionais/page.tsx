import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canReadMenuAddons } from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
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
    notFound();
  }

  const catalog = await getAdminAddonsCatalog(context.storeId);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <AdminAddonsPage
        storeName={context.storeName}
        sessionEmail={context.session.email}
        role={context.role}
        isMasterTransitional={context.isMaster}
        catalog={catalog}
      />
    </main>
  );
}
