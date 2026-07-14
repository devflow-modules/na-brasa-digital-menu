import type { Metadata } from "next";
import { requireMasterSession } from "@/features/master/auth/master-session";
import { MasterDashboard } from "@/features/master/components/master-dashboard";
import {
  getMasterDashboardSummary,
  listMasterStores,
} from "@/features/master/repositories/master-dashboard.repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel Master — DevFlow Menu",
  description: "Operação geral da plataforma DevFlow Menu.",
};

export default async function MasterPage() {
  const session = await requireMasterSession();

  const [summary, stores] = await Promise.all([
    getMasterDashboardSummary(),
    listMasterStores(),
  ]);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <MasterDashboard
        sessionName={session.name}
        sessionEmail={session.email}
        summary={summary}
        stores={stores}
      />
    </main>
  );
}
