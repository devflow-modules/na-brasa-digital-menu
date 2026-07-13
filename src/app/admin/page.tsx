import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/features/admin/auth/admin-session";
import {
  getAdminOrdersSummary,
  listRecentAdminOrders,
} from "@/features/admin/orders/admin-orders.repository";
import { AdminOrdersDashboard } from "@/features/admin/orders/components/admin-orders-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedidos — Admin Na Brasa",
  description: "Dashboard de pedidos do painel Na Brasa.",
};

export default async function AdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const orders = await listRecentAdminOrders();
  const summary = await getAdminOrdersSummary(orders.length);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <AdminOrdersDashboard
        sessionEmail={session.email}
        orders={orders}
        summary={summary}
      />
    </main>
  );
}
