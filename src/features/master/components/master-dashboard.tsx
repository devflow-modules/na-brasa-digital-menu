import { LogoutButton } from "@/features/admin/auth/components/logout-button";
import { MasterStoresList } from "@/features/master/components/master-stores-list";
import { MasterSummaryCards } from "@/features/master/components/master-summary-cards";
import type {
  MasterDashboardSummary,
  MasterStoreListItem,
} from "@/features/master/repositories/master-dashboard.repository";

type MasterDashboardProps = {
  sessionName: string;
  sessionEmail: string;
  summary: MasterDashboardSummary;
  stores: MasterStoreListItem[];
};

export function MasterDashboard({
  sessionName,
  sessionEmail,
  summary,
  stores,
}: MasterDashboardProps) {
  return (
    <div
      data-testid="master-dashboard"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <header className="flex flex-col gap-4 border-b border-stone-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-300/80">
            Área Master
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-orange-50">
            Painel Master
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-400">
            Selecione uma operação disponível. O acesso ao painel de uma loja
            exige um fluxo explícito de seleção (ainda não implementado).
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Sessão: {sessionName} ({sessionEmail})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LogoutButton className="border-stone-700 bg-stone-900 text-stone-100 hover:bg-stone-800" />
        </div>
      </header>

      <p
        data-testid="master-landing-note"
        className="rounded-xl border border-stone-700 bg-stone-900/60 px-4 py-3 text-sm text-stone-300"
      >
        Gerencie usuários de loja em &quot;Gerenciar usuários&quot;. Não há
        entrada automática no /admin de uma Store.
      </p>

      <MasterSummaryCards summary={summary} />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-orange-50">Lojas</h2>
          <p className="text-sm text-stone-400">
            Tenants cadastrados na plataforma. Usuários por loja já podem ser
            gerenciados.
          </p>
        </div>
        <MasterStoresList stores={stores} />
      </section>
    </div>
  );
}
