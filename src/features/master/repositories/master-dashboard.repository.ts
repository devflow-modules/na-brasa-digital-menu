import { prisma } from "@/lib/prisma";

export type MasterDashboardSummary = {
  storeCount: number;
  openStoreCount: number;
  orderCount: number;
  pendingOrderCount: number;
  completedOrderCount: number;
};

export type MasterStoreListItem = {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
  isOpen: boolean;
  orderCount: number;
  createdAt: Date;
};

export async function getMasterDashboardSummary(): Promise<MasterDashboardSummary> {
  const [
    storeCount,
    openStoreCount,
    orderCount,
    pendingOrderCount,
    completedOrderCount,
  ] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { isOpen: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
  ]);

  return {
    storeCount,
    openStoreCount,
    orderCount,
    pendingOrderCount,
    completedOrderCount,
  };
}

export async function listMasterStores(): Promise<MasterStoreListItem[]> {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      whatsapp: true,
      isOpen: true,
      createdAt: true,
      _count: {
        select: { orders: true },
      },
    },
  });

  return stores.map((store) => ({
    id: store.id,
    name: store.name,
    slug: store.slug,
    whatsapp: store.whatsapp,
    isOpen: store.isOpen,
    orderCount: store._count.orders,
    createdAt: store.createdAt,
  }));
}
