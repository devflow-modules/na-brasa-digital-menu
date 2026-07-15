"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { LogoutButton } from "@/features/admin/auth/components/logout-button";
import { CounterOrderItemEditor } from "@/features/admin/counter-order/components/counter-order-item-editor";
import {
  buildCreateCounterOrderPayload,
  buildDraftLine,
  COUNTER_ORDER_CUSTOMER_LABEL_MAX,
  filterCatalogProducts,
  getDraftItemCount,
  getDraftTotalCents,
  removeDraftLine,
  updateDraftLineQuantity,
} from "@/features/admin/counter-order/counter-order-draft";
import type {
  CounterCatalogCategory,
  CounterCatalogProduct,
  CounterDraftLine,
} from "@/features/admin/counter-order/counter-order.types";
import { useDialogFocusTrap } from "@/features/admin/counter-order/use-dialog-focus-trap";
import { formatMoney } from "@/features/menu/format-money";
import { createCounterOrderAction } from "@/features/orders/actions/create-counter-order-action";

type CounterOrderClientProps = {
  storeName: string;
  sessionEmail: string;
  categories: CounterCatalogCategory[];
};

type SuccessState = {
  orderId: string;
  orderCode: string;
};

export function CounterOrderClient({
  storeName,
  sessionEmail,
  categories,
}: CounterOrderClientProps) {
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | "all">(
    "all",
  );
  const [draftLines, setDraftLines] = useState<CounterDraftLine[]>([]);
  const [customerLabel, setCustomerLabel] = useState("");
  const [editingProduct, setEditingProduct] =
    useState<CounterCatalogProduct | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSubmittingRef = useRef(false);
  const reviewPanelRef = useRef<HTMLElement>(null);
  const reviewCloseRef = useRef<HTMLButtonElement>(null);

  const closeReview = useCallback(() => {
    if (isSubmittingRef.current) {
      return;
    }
    setShowReview(false);
  }, []);

  useDialogFocusTrap({
    open: showReview,
    onClose: closeReview,
    panelRef: reviewPanelRef,
    initialFocusRef: reviewCloseRef,
  });

  const visibleCategories = useMemo(() => {
    const query = search.trim();
    if (!query) {
      return categories;
    }

    return categories
      .map((category) => ({
        ...category,
        products: filterCatalogProducts(category.products, query),
      }))
      .filter((category) => category.products.length > 0);
  }, [categories, search]);

  const displayedCategories = useMemo(() => {
    if (activeCategoryId === "all" || search.trim()) {
      return visibleCategories;
    }

    return visibleCategories.filter(
      (category) => category.id === activeCategoryId,
    );
  }, [activeCategoryId, search, visibleCategories]);

  const draftTotalCents = getDraftTotalCents(draftLines);
  const draftItemCount = getDraftItemCount(draftLines);

  function handleProductTap(product: CounterCatalogProduct) {
    setSuccess(null);
    setErrorMessage(null);

    if (product.addons.length === 0) {
      setDraftLines((current) => [
        ...current,
        buildDraftLine({
          product,
          quantity: 1,
          addonIds: [],
        }),
      ]);
      return;
    }

    setEditingProduct(product);
  }

  function handleConfirmItem(payload: {
    quantity: number;
    addonIds: string[];
    notes: string;
  }) {
    if (!editingProduct) {
      return;
    }

    setSuccess(null);
    setDraftLines((current) => [
      ...current,
      buildDraftLine({
        product: editingProduct,
        quantity: payload.quantity,
        addonIds: payload.addonIds,
        notes: payload.notes,
      }),
    ]);
    setEditingProduct(null);
  }

  function handleSubmit() {
    if (draftLines.length === 0 || isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setErrorMessage(null);
    setSuccess(null);

    const payload = buildCreateCounterOrderPayload({
      customerLabel,
      lines: draftLines,
    });

    startTransition(async () => {
      try {
        const result = await createCounterOrderAction(payload);

        if (!result.ok) {
          setErrorMessage(result.message);
          return;
        }

        setDraftLines([]);
        setCustomerLabel("");
        setShowReview(false);
        setSuccess({
          orderId: result.orderId,
          orderCode: result.orderCode,
        });
      } finally {
        isSubmittingRef.current = false;
      }
    });
  }

  return (
    <div
      data-testid="admin-counter-order-page"
      className="mx-auto flex min-h-screen w-full max-w-3xl flex-col bg-stone-950 text-stone-100"
    >
      <header className="sticky top-0 z-20 border-b border-stone-800 bg-stone-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-orange-300/80">
              Balcão
            </p>
            <h1 className="mt-1 text-xl font-semibold text-orange-50">
              Nova comanda
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              {storeName} · {sessionEmail}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href="/admin"
              data-testid="counter-order-back-link"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 px-3 text-sm font-medium text-stone-100"
            >
              Pedidos
            </Link>
            <LogoutButton className="border-stone-700 bg-stone-900 text-stone-100 hover:bg-stone-800" />
          </div>
        </div>

        <label className="mt-3 block">
          <span className="sr-only">Buscar produto</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setActiveCategoryId("all");
            }}
            placeholder="Buscar produto"
            data-testid="counter-order-search"
            className="h-11 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100 placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          />
        </label>

        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Categorias"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategoryId === "all"}
            data-testid="counter-order-category-all"
            onClick={() => setActiveCategoryId("all")}
            className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${
              activeCategoryId === "all"
                ? "bg-orange-500 text-stone-950"
                : "border border-stone-700 bg-stone-900 text-stone-200"
            }`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={activeCategoryId === category.id}
              data-testid={`counter-order-category-${category.id}`}
              onClick={() => {
                setSearch("");
                setActiveCategoryId(category.id);
              }}
              className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${
                activeCategoryId === category.id
                  ? "bg-orange-500 text-stone-950"
                  : "border border-stone-700 bg-stone-900 text-stone-200"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-4 pb-36 pt-4">
        {success ? (
          <div
            role="status"
            aria-live="polite"
            data-testid="counter-order-success"
            className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          >
            <p className="font-semibold">Comanda {success.orderCode} criada</p>
            <p className="mt-1 text-emerald-100/80">
              Pedido na fila · pagamento depois.
            </p>
            <Link
              href={`/admin/pedidos/${success.orderId}`}
              className="mt-2 inline-flex text-sm font-medium text-orange-200 underline-offset-2 hover:underline"
            >
              Ver pedido
            </Link>
          </div>
        ) : null}

        {errorMessage && !showReview ? (
          <p
            role="alert"
            data-testid="counter-order-error"
            className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100"
          >
            {errorMessage}
          </p>
        ) : null}

        {displayedCategories.length === 0 ? (
          <div
            data-testid="counter-order-empty-catalog"
            className="rounded-2xl border border-dashed border-stone-700 px-4 py-10 text-center text-sm text-stone-400"
          >
            Nenhum produto encontrado.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {displayedCategories.map((category) => (
              <section key={category.id} className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
                  {category.name}
                </h2>
                <ul className="flex flex-col gap-2">
                  {category.products.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        data-testid={`counter-order-product-${product.id}`}
                        onClick={() => handleProductTap(product)}
                        aria-label={`Adicionar ${product.name}, ${formatMoney(product.priceCents)}`}
                        className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-stone-50">
                            {product.name}
                          </span>
                          {product.description ? (
                            <span className="mt-1 block line-clamp-1 text-xs text-stone-400">
                              {product.description}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-orange-200">
                          {formatMoney(product.priceCents)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-stone-950 via-stone-950/95 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
        <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-2xl border border-stone-700 bg-stone-900 p-3 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-stone-300">
              {draftItemCount === 0
                ? "Nenhum item"
                : `${draftItemCount} ${draftItemCount === 1 ? "item" : "itens"}`}
            </span>
            <span
              data-testid="counter-order-draft-total"
              className="font-semibold text-orange-100"
            >
              {formatMoney(draftTotalCents)}
            </span>
          </div>
          <button
            type="button"
            data-testid="counter-order-open-review"
            disabled={draftLines.length === 0}
            onClick={() => {
              setErrorMessage(null);
              setSuccess(null);
              setShowReview(true);
            }}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            Revisar comanda
          </button>
        </div>
      </div>

      {showReview ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          role="presentation"
        >
          <div
            className="absolute inset-0"
            aria-hidden="true"
            onClick={closeReview}
          />
          <section
            ref={reviewPanelRef}
            data-testid="counter-order-review"
            role="dialog"
            aria-modal="true"
            aria-labelledby="counter-order-review-title"
            className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-2xl border border-stone-700 bg-stone-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="counter-order-review-title"
                  className="text-lg font-semibold text-orange-50"
                >
                  Revisar comanda
                </h2>
                <p className="mt-1 text-sm text-stone-400">
                  Pagamento será registrado depois.
                </p>
              </div>
              <button
                ref={reviewCloseRef}
                type="button"
                disabled={isPending}
                onClick={closeReview}
                aria-label="Fechar revisão da comanda"
                className="rounded-lg px-2 py-1 text-sm text-stone-400 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
              >
                Fechar
              </button>
            </div>

            <ul className="flex flex-col gap-3">
              {draftLines.map((line) => (
                <li
                  key={line.draftId}
                  data-testid={`counter-order-draft-line-${line.draftId}`}
                  className="rounded-xl border border-stone-800 bg-stone-900/70 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-stone-100">
                        {line.productName}
                      </p>
                      {line.addons.length > 0 ? (
                        <p className="mt-1 text-xs text-stone-400">
                          {line.addons.map((addon) => addon.name).join(", ")}
                        </p>
                      ) : null}
                      {line.notes ? (
                        <p className="mt-1 text-xs text-stone-500">
                          Obs.: {line.notes}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-orange-200">
                      {formatMoney(line.lineTotalCentsForDisplay)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        aria-label={`Diminuir quantidade de ${line.productName}`}
                        onClick={() =>
                          setDraftLines((current) =>
                            updateDraftLineQuantity(
                              current,
                              line.draftId,
                              line.quantity - 1,
                            ),
                          )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-800 ring-1 ring-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center text-sm font-semibold">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={isPending}
                        aria-label={`Aumentar quantidade de ${line.productName}`}
                        onClick={() =>
                          setDraftLines((current) =>
                            updateDraftLineQuantity(
                              current,
                              line.draftId,
                              line.quantity + 1,
                            ),
                          )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-800 ring-1 ring-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      data-testid={`counter-order-remove-${line.draftId}`}
                      aria-label={`Remover ${line.productName} da comanda`}
                      onClick={() =>
                        setDraftLines((current) =>
                          removeDraftLine(current, line.draftId),
                        )
                      }
                      className="text-sm font-medium text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <label className="block">
              <span className="text-sm font-medium text-stone-200">
                Nome ou identificação
              </span>
              <input
                type="text"
                value={customerLabel}
                maxLength={COUNTER_ORDER_CUSTOMER_LABEL_MAX}
                disabled={isPending}
                onChange={(event) => setCustomerLabel(event.target.value)}
                placeholder="Opcional — ex.: João, boné azul"
                data-testid="counter-order-customer-label"
                className="mt-2 h-11 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100 placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
              />
              <span className="mt-1 block text-xs text-stone-500">
                Ajuda a localizar o pedido na fila. Sem telefone.
              </span>
            </label>

            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-300">Total</span>
              <span className="text-base font-semibold text-orange-100">
                {formatMoney(draftTotalCents)}
              </span>
            </div>

            {errorMessage ? (
              <p
                role="alert"
                data-testid="counter-order-review-error"
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100"
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="button"
              data-testid="counter-order-submit"
              disabled={draftLines.length === 0 || isPending}
              onClick={handleSubmit}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              {isPending ? "Registrando…" : "Registrar comanda"}
            </button>
          </section>
        </div>
      ) : null}

      {editingProduct ? (
        <CounterOrderItemEditor
          key={editingProduct.id}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onConfirm={handleConfirmItem}
        />
      ) : null}
    </div>
  );
}
