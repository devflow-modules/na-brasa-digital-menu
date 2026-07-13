import { formatMoney } from "@/features/menu/format-money";
import type { PublicMenuStore } from "@/features/menu/menu.repository";
import { StoreStatusBadge } from "@/features/menu/components/store-status-badge";

type StoreHeroProps = {
  store: PublicMenuStore;
};

export function StoreHero({ store }: StoreHeroProps) {
  const description =
    store.description ??
    "Lanches artesanais e espetinhos feitos na brasa.";

  return (
    <header className="border-b border-orange-500/20 bg-gradient-to-b from-stone-950 via-stone-900 to-orange-950/40 px-4 pb-8 pt-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange-300/80">
          Cardápio online
        </p>
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-orange-50 sm:text-5xl">
            {store.name}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-stone-300">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StoreStatusBadge isOpen={store.isOpen} />
          {store.pickupEnabled ? (
            <span className="inline-flex items-center rounded-full bg-stone-800 px-3 py-1 text-xs font-medium text-stone-200 ring-1 ring-stone-600">
              Retirada
            </span>
          ) : null}
          {store.deliveryEnabled ? (
            <span className="inline-flex items-center rounded-full bg-stone-800 px-3 py-1 text-xs font-medium text-stone-200 ring-1 ring-stone-600">
              Entrega
            </span>
          ) : null}
        </div>

        <dl className="grid gap-2 text-sm text-stone-300">
          {store.openingHours ? (
            <div>
              <dt className="sr-only">Horário</dt>
              <dd>{store.openingHours}</dd>
            </div>
          ) : null}
          {store.deliveryEnabled && store.deliveryFeeCents > 0 ? (
            <div>
              <dt className="sr-only">Taxa de entrega</dt>
              <dd>Taxa de entrega: {formatMoney(store.deliveryFeeCents)}</dd>
            </div>
          ) : null}
          {store.minimumOrderAmountCents > 0 ? (
            <div>
              <dt className="sr-only">Pedido mínimo</dt>
              <dd>
                Pedido mínimo: {formatMoney(store.minimumOrderAmountCents)}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </header>
  );
}
