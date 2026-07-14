import Link from "next/link";
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
            DevFlow Menu — Operação Master
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-orange-50">
            Painel Master
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-400">
            Operação geral da plataforma. Na Brasa é o primeiro cliente/tenant
            real.
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Sessão: {sessionName} ({sessionEmail})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin"
            data-testid="master-link-admin-transitional"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 px-4 text-sm font-medium text-stone-200 hover:bg-stone-800"
          >
            Abrir /admin (temporário)
          </Link>
          <LogoutButton className="border-stone-700 bg-stone-900 text-stone-100 hover:bg-stone-800" />
        </div>
      </header>

      <p
        data-testid="master-transitional-note"
        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
      >
        Acesso de MASTER ao{" "}
        <Link href="/admin" className="underline underline-offset-2">
          /admin
        </Link>{" "}
        ainda é transicional. Gerencie usuários de loja em &quot;Gerenciar
        usuários&quot;. CRUD completo de lojas virá em PRs futuras.
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
