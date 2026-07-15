import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canCreateOrder } from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
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
    notFound();
  }

  const categories = await getCounterOrderCatalog(context.storeId);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <CounterOrderClient
        storeName={context.storeName}
        sessionEmail={context.session.email}
        categories={categories}
      />
    </main>
  );
}
