import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireMasterSession } from "@/features/master/auth/master-session";
import { MasterStoreUsersPageView } from "@/features/master/users/components/master-store-users-page";
import { getMasterStoreUsersPageData } from "@/features/master/users/master-store-users.repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usuários da loja — Master",
  description: "Gerenciar usuários de loja no painel Master.",
};

type MasterStoreUsersRouteProps = {
  params: Promise<{ storeId: string }>;
};

export default async function MasterStoreUsersRoute({
  params,
}: MasterStoreUsersRouteProps) {
  const session = await requireMasterSession();
  const { storeId } = await params;
  const data = await getMasterStoreUsersPageData(storeId);

  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <MasterStoreUsersPageView
        data={data}
        sessionEmail={session.email}
      />
    </main>
  );
}
