import type { Metadata } from "next";
import { canCreateOrder } from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { AdminAccessDenied } from "@/features/admin/chrome/admin-access-denied";
import { getCounterOrderCatalog } from "@/features/admin/counter-order/counter-order-catalog";
import { CounterOrderClient } from "@/features/admin/counter-order/components/counter-order-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Balcão — Admin",
  description: "Registrar comanda digital de balcão.",
};

export default async function AdminCounterOrderPage() {
  const context = await requireAdminStoreContext();

  if (!canCreateOrder(context.role)) {
    return (
      <main>
        <AdminAccessDenied role={context.role} />
      </main>
    );
  }

  const categories = await getCounterOrderCatalog(context.storeId);

  return (
    <main>
      <CounterOrderClient categories={categories} />
    </main>
  );
}
