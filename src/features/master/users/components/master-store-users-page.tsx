import Link from "next/link";
import { LogoutButton } from "@/features/admin/auth/components/logout-button";
import { MasterCreateStoreUserForm } from "@/features/master/users/components/master-create-store-user-form";
import { MasterStoreUsersList } from "@/features/master/users/components/master-store-users-list";
import type { MasterStoreUsersPageData } from "@/features/master/users/master-store-users.types";

type MasterStoreUsersPageProps = {
  data: MasterStoreUsersPageData;
  sessionEmail: string;
};

export function MasterStoreUsersPageView({
  data,
  sessionEmail,
}: MasterStoreUsersPageProps) {
  const { store, users } = data;

  return (
    <div
      data-testid="master-store-users-page"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <header className="flex flex-col gap-4 border-b border-stone-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-300/80">
            Gerenciar acessos
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-orange-50">
            Usuários da loja — {store.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-400">
            Crie usuários para operação do painel da loja. Roles de loja não
            acessam /master.
          </p>
          <p className="mt-2 text-sm text-stone-500">
            slug: {store.slug} · sessão: {sessionEmail}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/master"
            data-testid="master-store-users-back"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 px-4 text-sm font-medium text-stone-200 hover:bg-stone-800"
          >
            Voltar ao /master
          </Link>
          <LogoutButton className="border-stone-700 bg-stone-900 text-stone-100 hover:bg-stone-800" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <MasterCreateStoreUserForm storeId={store.id} />
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold text-orange-50">
              Usuários vinculados
            </h2>
            <p className="text-sm text-stone-400">
              {users.length} usuário(s) nesta Store.
            </p>
          </div>
          <MasterStoreUsersList storeId={store.id} users={users} />
        </div>
      </div>
    </div>
  );
}
