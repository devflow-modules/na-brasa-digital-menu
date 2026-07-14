import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { getAdminOrderById } from "@/features/admin/orders/admin-orders.repository";
import { OrderDetailCard } from "@/features/admin/orders/components/order-detail-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedido — Admin",
  description: "Detalhe de pedido do painel da loja.",
};

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  const context = await requireAdminStoreContext();

  const { id } = await params;
  const order = await getAdminOrderById(id, context.storeId);

  if (!order) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <OrderDetailCard order={order} role={context.role} />
      </div>
    </main>
  );
}
