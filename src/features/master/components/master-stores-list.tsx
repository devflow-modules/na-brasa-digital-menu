import Link from "next/link";
import {
  formatMasterDateTime,
  maskWhatsApp,
} from "@/features/master/master-formatters";
import type { MasterStoreListItem } from "@/features/master/repositories/master-dashboard.repository";

type MasterStoresListProps = {
  stores: MasterStoreListItem[];
};

export function MasterStoresList({ stores }: MasterStoresListProps) {
  if (stores.length === 0) {
    return (
      <div
        data-testid="master-stores-empty"
        className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/40 px-5 py-10 text-center"
      >
        <p className="text-base font-medium text-stone-100">
          Nenhuma loja cadastrada ainda.
        </p>
        <p className="mt-2 text-sm text-stone-400">
          O bootstrap/seed cria a loja inicial do primeiro tenant.
        </p>
      </div>
    );
  }

  return (
    <section data-testid="master-stores-list" className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {stores.map((store) => (
          <li
            key={store.id}
            data-testid={`master-store-${store.slug}`}
            className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-base font-semibold text-orange-50">
                  {store.name}
                </p>
                <p className="text-sm text-stone-400">
                  slug: <span className="text-stone-200">{store.slug}</span>
                </p>
                <p className="text-sm text-stone-400">
                  WhatsApp:{" "}
                  <span className="text-stone-200">
                    {maskWhatsApp(store.whatsapp)}
                  </span>
                </p>
                <p className="text-sm text-stone-400">
                  Pedidos:{" "}
                  <span className="text-stone-200">{store.orderCount}</span>
                  {" · "}
                  {store.isOpen ? "Aberta" : "Fechada"}
                  {" · "}
                  criada em {formatMasterDateTime(store.createdAt)}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:items-stretch">
                <Link
                  href={`/master/stores/${store.id}/users`}
                  data-testid={`master-store-users-link-${store.slug}`}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 text-sm font-medium text-orange-200 hover:bg-orange-500/20"
                >
                  Gerenciar usuários
                </Link>
                <Link
                  href={`/${store.slug}`}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 px-4 text-sm font-medium text-stone-200 hover:bg-stone-800"
                >
                  Abrir cardápio público
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
