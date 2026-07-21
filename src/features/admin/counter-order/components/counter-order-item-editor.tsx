"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  COUNTER_ORDER_ITEM_NOTES_MAX,
  COUNTER_ORDER_MAX_QUANTITY,
  dedupeAddonIds,
} from "@/features/admin/counter-order/counter-order-draft";
import type {
  CounterCatalogAddon,
  CounterCatalogProduct,
} from "@/features/admin/counter-order/counter-order.types";
import { useDialogFocusTrap } from "@/features/admin/counter-order/use-dialog-focus-trap";
import { formatMoney } from "@/features/menu/format-money";
import { formatAddonGroupSelectionHint } from "@/features/orders/addon-group-selection";

type CounterOrderItemEditorProps = {
  product: CounterCatalogProduct;
  onClose: () => void;
  onConfirm: (payload: {
    quantity: number;
    addonIds: string[];
    notes: string;
  }) => void;
};

export function CounterOrderItemEditor({
  product,
  onClose,
  onConfirm,
}: CounterOrderItemEditorProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();
  const notesId = useId();

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useDialogFocusTrap({
    open: true,
    onClose: handleClose,
    panelRef,
    initialFocusRef: closeButtonRef,
  });

  const addonLookup = useMemo(() => {
    const map = new Map<string, CounterCatalogAddon>();
    for (const addon of product.addons) {
      map.set(addon.id, addon);
    }
    for (const group of product.addonGroups) {
      for (const option of group.options) {
        map.set(option.addon.id, option.addon);
      }
    }
    return map;
  }, [product.addons, product.addonGroups]);

  const selectedAddons = useMemo(
    () =>
      selectedAddonIds
        .map((id) => addonLookup.get(id))
        .filter((addon): addon is CounterCatalogAddon => Boolean(addon)),
    [addonLookup, selectedAddonIds],
  );

  const previewTotal = useMemo(() => {
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.priceCents,
      0,
    );
    return (product.priceCents + addonsTotal) * quantity;
  }, [product.priceCents, selectedAddons, quantity]);

  function toggleIndependentAddon(addonId: string) {
    setSelectedAddonIds((current) =>
      current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId],
    );
  }

  function selectGroupOption(
    groupId: string,
    addonId: string,
    maxSelection: number,
  ) {
    const group = product.addonGroups.find((row) => row.id === groupId);
    if (!group) {
      return;
    }
    const optionIds = new Set(group.options.map((option) => option.addon.id));

    setSelectedAddonIds((current) => {
      const outside = current.filter((id) => !optionIds.has(id));
      if (maxSelection === 1) {
        return [...outside, addonId];
      }

      if (current.includes(addonId)) {
        return current.filter((id) => id !== addonId);
      }

      const selectedInGroup = current.filter((id) => optionIds.has(id));
      if (selectedInGroup.length >= maxSelection) {
        return current;
      }
      return [...current, addonId];
    });
  }

  function clearGroupSelection(groupId: string) {
    const group = product.addonGroups.find((row) => row.id === groupId);
    if (!group) {
      return;
    }
    const optionIds = new Set(group.options.map((option) => option.addon.id));
    setSelectedAddonIds((current) =>
      current.filter((id) => !optionIds.has(id)),
    );
  }

  const hasAddonUi =
    product.addons.length > 0 || product.addonGroups.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 cursor-default"
        aria-hidden="true"
        onClick={handleClose}
      />

      <div
        ref={panelRef}
        data-testid="counter-order-item-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="counter-order-item-title"
        aria-describedby={product.description ? descriptionId : undefined}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-2xl border border-stone-700 bg-stone-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="counter-order-item-title"
              className="text-lg font-semibold text-orange-50"
            >
              {product.name}
            </h2>
            <p className="mt-1 text-sm text-orange-300">
              {formatMoney(product.priceCents)}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            data-testid="counter-order-item-editor-close"
            onClick={handleClose}
            aria-label="Fechar editor do item"
            className="rounded-lg px-2 py-1 text-sm text-stone-400 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            Fechar
          </button>
        </div>

        {product.description ? (
          <p id={descriptionId} className="text-sm text-stone-400">
            {product.description}
          </p>
        ) : null}

        {hasAddonUi ? (
          <div className="flex flex-col gap-4">
            {product.addonGroups.map((group) => {
              const optionIds = group.options.map((option) => option.addon.id);
              const selectedInGroup = selectedAddonIds.filter((id) =>
                optionIds.includes(id),
              );
              const useRadio = group.maxSelection === 1;

              return (
                <fieldset
                  key={group.id}
                  data-testid={`counter-order-addon-group-${group.id}`}
                  className="flex flex-col gap-2"
                >
                  <legend className="text-sm font-medium text-stone-200">
                    {group.name}
                  </legend>
                  <p className="text-xs text-stone-500">
                    {formatAddonGroupSelectionHint(group)}
                    {group.maxSelection > 1
                      ? ` · ${selectedInGroup.length} de ${group.maxSelection} selecionados`
                      : null}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {useRadio && group.minSelection === 0 ? (
                      <li>
                        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-3 text-sm text-stone-300">
                          <input
                            type="radio"
                            name={`counter-addon-group-${group.id}`}
                            data-testid={`counter-order-addon-group-${group.id}-none`}
                            checked={selectedInGroup.length === 0}
                            onChange={() => clearGroupSelection(group.id)}
                            className="h-5 w-5 accent-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                          />
                          Sem adicional
                        </label>
                      </li>
                    ) : null}
                    {group.options.map((option) => {
                      const checked = selectedAddonIds.includes(
                        option.addon.id,
                      );
                      return (
                        <li key={option.addon.id}>
                          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-3">
                            <span className="flex items-center gap-3 text-sm text-stone-100">
                              <input
                                type={useRadio ? "radio" : "checkbox"}
                                name={
                                  useRadio
                                    ? `counter-addon-group-${group.id}`
                                    : undefined
                                }
                                data-testid={`counter-order-addon-${option.addon.id}`}
                                checked={checked}
                                onChange={() =>
                                  selectGroupOption(
                                    group.id,
                                    option.addon.id,
                                    group.maxSelection,
                                  )
                                }
                                className="h-5 w-5 accent-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                              />
                              {option.addon.name}
                            </span>
                            <span className="text-sm text-orange-300">
                              + {formatMoney(option.addon.priceCents)}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              );
            })}

            {product.addons.length > 0 ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-stone-200">
                  Adicionais
                </legend>
                <ul className="flex flex-col gap-2">
                  {product.addons.map((addon) => {
                    const checked = selectedAddonIds.includes(addon.id);
                    return (
                      <li key={addon.id}>
                        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-3">
                          <span className="flex items-center gap-3 text-sm text-stone-100">
                            <input
                              type="checkbox"
                              data-testid={`counter-order-addon-${addon.id}`}
                              checked={checked}
                              onChange={() => toggleIndependentAddon(addon.id)}
                              className="h-5 w-5 accent-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                            />
                            {addon.name}
                          </span>
                          <span className="text-sm text-orange-300">
                            + {formatMoney(addon.priceCents)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            ) : null}
          </div>
        ) : null}

        <div>
          <label
            htmlFor={notesId}
            className="text-sm font-medium text-stone-200"
          >
            Observação do item
          </label>
          <textarea
            id={notesId}
            data-testid="counter-order-item-notes"
            value={notes}
            maxLength={COUNTER_ORDER_ITEM_NOTES_MAX}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Ex.: sem cebola"
            className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-stone-300">Quantidade</p>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-800 text-lg ring-1 ring-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <span className="min-w-6 text-center text-sm font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((value) =>
                  Math.min(COUNTER_ORDER_MAX_QUANTITY, value + 1),
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-800 text-lg ring-1 ring-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          data-testid="counter-order-item-confirm"
          onClick={() =>
            onConfirm({
              quantity,
              addonIds: dedupeAddonIds(selectedAddonIds),
              notes,
            })
          }
          className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          Adicionar à comanda · {formatMoney(previewTotal)}
        </button>
      </div>
    </div>
  );
}
