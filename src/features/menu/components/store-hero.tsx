import { formatMoney } from "@/features/menu/format-money";
import type { PublicMenuStore } from "@/features/menu/menu.types";
import { StoreStatusBadge } from "@/features/menu/components/store-status-badge";

type StoreHeroProps = {
  store: PublicMenuStore;
};

/** PLATFORM fallback when Store.description is null/empty. */
const STORE_DESCRIPTION_FALLBACK =
  "Escolha seus itens e faça seu pedido online.";

function OperationalChip({
  label,
  positive,
  testId,
}: {
  label: string;
  positive: boolean;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={
        positive
          ? "inline-flex items-center rounded-lg bg-stone-800/90 px-2.5 py-1.5 text-xs font-medium text-stone-100 ring-1 ring-stone-600"
          : "inline-flex items-center rounded-lg bg-stone-900/80 px-2.5 py-1.5 text-xs font-medium text-stone-400 ring-1 ring-stone-700"
      }
    >
      {label}
    </span>
  );
}

function resolveStoreDescription(description: string | null): string {
  const trimmed = description?.trim();
  return trimmed ? trimmed : STORE_DESCRIPTION_FALLBACK;
}

export function StoreHero({ store }: StoreHeroProps) {
  const description = resolveStoreDescription(store.description);

  return (
    <header
      data-testid="store-hero"
      className="border-b border-orange-500/25 bg-gradient-to-b from-stone-950 via-stone-900 to-orange-950/50 px-4 pb-8 pt-8 sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p
            data-testid="store-hero-eyebrow"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300/90"
          >
            Cardápio online
          </p>
          <p className="text-sm font-medium text-orange-200/90">
            Pedido direto pelo WhatsApp
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-orange-50 sm:text-4xl">
            {store.name}
          </h1>
          <p
            data-testid="store-hero-description"
            className="text-sm leading-relaxed text-stone-300"
          >
            {description}
          </p>
          <p className="text-sm leading-relaxed text-stone-400">
            Escolha seus itens, revise o pedido e finalize com a equipe pelo
            WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StoreStatusBadge isOpen={store.isOpen} />
          <OperationalChip
            testId="store-pickup-chip"
            positive={store.pickupEnabled}
            label={
              store.pickupEnabled
                ? "Retirada disponível"
                : "Retirada indisponível"
            }
          />
          <OperationalChip
            testId="store-delivery-chip"
            positive={store.deliveryEnabled}
            label={
              store.deliveryEnabled
                ? "Entrega disponível"
                : "Entrega indisponível"
            }
          />
        </div>

        {!store.isOpen ? (
          <div
            data-testid="store-closed-notice"
            className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-50"
            role="status"
          >
            <p className="font-semibold text-amber-100">Fechado no momento</p>
            <p className="mt-1 text-amber-100/90">
              Você ainda pode consultar o cardápio, mas os pedidos estão
              pausados.
            </p>
          </div>
        ) : (
          <p
            data-testid="store-open-notice"
            className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-100"
            role="status"
          >
            Aberto para pedidos — monte seu pedido e finalize no WhatsApp.
          </p>
        )}

        <div
          data-testid="store-operational-details"
          className="grid gap-2 rounded-2xl border border-stone-800 bg-stone-950/60 p-4 text-sm text-stone-300"
        >
          {store.address ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Endereço
              </span>
              <span data-testid="store-address">{store.address}</span>
            </div>
          ) : null}
          {store.openingHours ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Horário
              </span>
              <span data-testid="store-opening-hours">{store.openingHours}</span>
            </div>
          ) : null}
          {store.deliveryEnabled && store.deliveryFeeCents > 0 ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Taxa de entrega
              </span>
              <span data-testid="store-delivery-fee">
                Taxa de entrega: {formatMoney(store.deliveryFeeCents)}
              </span>
            </div>
          ) : null}
          {store.minimumOrderAmountCents > 0 ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Pedido mínimo
              </span>
              <span>
                Pedido mínimo: {formatMoney(store.minimumOrderAmountCents)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
