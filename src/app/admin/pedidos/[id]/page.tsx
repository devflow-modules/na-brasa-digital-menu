import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/features/admin/auth/admin-session";
import { getAdminOrderById } from "@/features/admin/orders/admin-orders.repository";
import { OrderDetailCard } from "@/features/admin/orders/components/order-detail-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedido — Admin Na Brasa",
  description: "Detalhe read-only de pedido do painel Na Brasa.",
};

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const order = await getAdminOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <OrderDetailCard order={order} />
      </div>
    </main>
  );
}
