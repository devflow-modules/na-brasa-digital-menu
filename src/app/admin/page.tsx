import type { Metadata } from "next";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import {
  getAdminOrdersSummary,
  listRecentAdminOrders,
} from "@/features/admin/orders/admin-orders.repository";
import { AdminOrdersDashboard } from "@/features/admin/orders/components/admin-orders-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedidos — Admin",
  description: "Dashboard de pedidos do painel da loja.",
};

export default async function AdminPage() {
  const context = await requireAdminStoreContext();

  const orders = await listRecentAdminOrders(context.storeId);
  const summary = await getAdminOrdersSummary(context.storeId, orders.length);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <AdminOrdersDashboard
        sessionEmail={context.session.email}
        storeName={context.storeName}
        isMasterTransitional={context.isMaster}
        orders={orders}
        summary={summary}
      />
    </main>
  );
}
