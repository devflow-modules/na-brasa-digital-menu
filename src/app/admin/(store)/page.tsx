import type { Metadata } from "next";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { parseAdminOrderQueueSearchParams } from "@/features/admin/orders/admin-order-queue-filters";
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

type AdminPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const context = await requireAdminStoreContext();
  const params = await searchParams;
  const filters = parseAdminOrderQueueSearchParams(params);

  const orders = await listRecentAdminOrders(context.storeId, { filters });
  const summary = await getAdminOrdersSummary(context.storeId, orders.length);

  return (
    <main>
      <AdminOrdersDashboard
        orders={orders}
        summary={summary}
        filters={filters}
      />
    </main>
  );
}
