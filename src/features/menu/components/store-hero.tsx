"use client";

import { useState } from "react";
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
          ? "inline-flex items-center rounded-lg bg-stone-800/90 px-2.5 py-1 text-xs font-medium text-stone-100 ring-1 ring-stone-600"
          : "inline-flex items-center rounded-lg bg-stone-900/80 px-2.5 py-1 text-xs font-medium text-stone-400 ring-1 ring-stone-700"
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

function scrollToMenuStart() {
  const target =
    document.getElementById("menu-featured-section") ??
    document.getElementById("menu-catalog-heading");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function StoreHero({ store }: StoreHeroProps) {
  const description = resolveStoreDescription(store.description);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasDetails =
    Boolean(store.address) ||
    Boolean(store.openingHours) ||
    (store.deliveryEnabled && store.deliveryFeeCents > 0) ||
    (store.deliveryEnabled && store.minimumOrderAmountCents > 0);

  return (
    <header
      data-testid="store-hero"
      className="border-b border-orange-500/25 bg-gradient-to-b from-stone-950 via-stone-900 to-orange-950/40 px-4 pb-6 pt-6 sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex flex-col gap-3">
          <p
            data-testid="store-hero-eyebrow"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300/90"
          >
            Cardápio online
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-orange-50 sm:text-4xl">
            {store.name}
          </h1>
          <p
            data-testid="store-hero-description"
            className="max-w-2xl text-sm leading-relaxed text-stone-300"
          >
            {description}
          </p>
          <p className="text-sm text-stone-400">
            Monte o pedido aqui e confirme pelo WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StoreStatusBadge isOpen={store.isOpen} />
          <OperationalChip
            testId="store-pickup-chip"
            positive={store.pickupEnabled}
            label={store.pickupEnabled ? "Retirada" : "Sem retirada"}
          />
          <OperationalChip
            testId="store-delivery-chip"
            positive={store.deliveryEnabled}
            label={store.deliveryEnabled ? "Entrega" : "Sem entrega"}
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
            className="text-sm font-medium text-emerald-200"
            role="status"
          >
            Aberto agora — escolha seus itens e finalize pelo WhatsApp.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            data-testid="store-start-order-cta"
            onClick={scrollToMenuStart}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-bold text-stone-950 shadow-md shadow-orange-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            Começar pedido
          </button>
          {hasDetails ? (
            <button
              type="button"
              data-testid="store-details-toggle"
              aria-expanded={detailsOpen}
              aria-controls="store-operational-details"
              onClick={() => setDetailsOpen((open) => !open)}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-700 bg-stone-950/50 px-4 text-sm font-medium text-stone-200 hover:bg-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
            >
              Informações da loja {detailsOpen ? "▴" : "▾"}
            </button>
          ) : null}
        </div>

        {hasDetails && detailsOpen ? (
          <div
            id="store-operational-details"
            data-testid="store-operational-details"
            className="grid gap-2 rounded-2xl border border-stone-800 bg-stone-950/60 p-4 text-sm text-stone-300 sm:grid-cols-2"
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
                <span data-testid="store-opening-hours">
                  {store.openingHours}
                </span>
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
            {store.deliveryEnabled && store.minimumOrderAmountCents > 0 ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Pedido mínimo para entrega
                </span>
                <span data-testid="store-minimum-order">
                  Pedido mínimo para entrega:{" "}
                  {formatMoney(store.minimumOrderAmountCents)}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
