import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { getAdminIfoodActionPanel } from "@/features/admin/orders/get-admin-ifood-action-panel";
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

  const ifoodActionPanel = await getAdminIfoodActionPanel({
    orderId: order.id,
    storeId: context.storeId,
    role: context.role,
    status: order.status,
    source: order.source,
  });

  return (
    <main>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <OrderDetailCard
          order={order}
          role={context.role}
          ifoodActionPanel={ifoodActionPanel}
        />
      </div>
    </main>
  );
}
