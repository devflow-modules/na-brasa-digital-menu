"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { formatMoney } from "@/features/menu/format-money";
import type { CartAddon } from "@/features/cart/types";
import type { PublicMenuProduct } from "@/features/menu/menu.types";
import { formatAddonGroupSelectionHint } from "@/features/orders/addon-group-selection";

type AddToCartPanelProps = {
  product: PublicMenuProduct;
  onClose: () => void;
  onConfirm: (payload: {
    quantity: number;
    selectedAddons: CartAddon[];
  }) => void;
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null || element.getClientRects().length > 0,
  );
}

export function AddToCartPanel({
  product,
  onClose,
  onConfirm,
}: AddToCartPanelProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [clientError, setClientError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const descriptionId = useId();

  const addonLookup = useMemo(() => {
    const map = new Map<string, CartAddon>();
    for (const addon of product.addons) {
      map.set(addon.id, {
        id: addon.id,
        name: addon.name,
        priceCents: addon.priceCents,
      });
    }
    for (const group of product.addonGroups) {
      for (const option of group.options) {
        map.set(option.addon.id, {
          id: option.addon.id,
          name: option.addon.name,
          priceCents: option.addon.priceCents,
        });
      }
    }
    return map;
  }, [product.addons, product.addonGroups]);

  const selectedAddons = useMemo(
    () =>
      selectedAddonIds
        .map((id) => addonLookup.get(id))
        .filter((addon): addon is CartAddon => Boolean(addon)),
    [addonLookup, selectedAddonIds],
  );

  const previewTotal = useMemo(() => {
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.priceCents,
      0,
    );
    return (product.priceCents + addonsTotal) * quantity;
  }, [product.priceCents, selectedAddons, quantity]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const active = document.activeElement;
    returnFocusRef.current =
      active instanceof HTMLElement ? active : null;

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusInitial = () => {
      const focusables = getFocusableElements(panel);
      const target = closeButtonRef.current ?? focusables[0];
      target?.focus();
    };

    const focusFrame = requestAnimationFrame(focusInitial);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusables = getFocusableElements(panelRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;

      if (!panelRef.current.contains(current)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey) {
        if (current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (current === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [handleClose]);

  function toggleIndependentAddon(addonId: string) {
    setClientError(null);
    setSelectedAddonIds((current) =>
      current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId],
    );
  }

  function selectGroupOption(groupId: string, addonId: string, maxSelection: number) {
    setClientError(null);
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
    setClientError(null);
    const group = product.addonGroups.find((row) => row.id === groupId);
    if (!group) {
      return;
    }
    const optionIds = new Set(group.options.map((option) => option.addon.id));
    setSelectedAddonIds((current) => current.filter((id) => !optionIds.has(id)));
  }

  function handleConfirm() {
    for (const group of product.addonGroups) {
      const optionIds = new Set(group.options.map((option) => option.addon.id));
      const selectedCount = selectedAddonIds.filter((id) => optionIds.has(id)).length;
      if (selectedCount < group.minSelection) {
        setClientError(
          group.minSelection === 1 && group.maxSelection === 1
            ? `Selecione uma opção em “${group.name}”.`
            : `Selecione pelo menos ${group.minSelection} opção(ões) em “${group.name}”.`,
        );
        return;
      }
      if (selectedCount > group.maxSelection) {
        setClientError(
          group.maxSelection === 1
            ? `Escolha no máximo 1 opção em “${group.name}”.`
            : `Escolha no máximo ${group.maxSelection} opções em “${group.name}”.`,
        );
        return;
      }
    }

    onConfirm({
      quantity,
      selectedAddons,
    });
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
        data-testid="add-to-cart-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-cart-title"
        aria-describedby={product.description ? descriptionId : undefined}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-2xl border border-stone-700 bg-stone-950 p-4 sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="add-to-cart-title"
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
            data-testid="add-to-cart-close-button"
            onClick={handleClose}
            aria-label="Fechar painel de adicionar ao carrinho"
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
                  data-testid={`menu-addon-group-${group.id}`}
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
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-3 text-sm text-stone-300">
                          <input
                            type="radio"
                            name={`addon-group-${group.id}`}
                            data-testid={`menu-addon-group-${group.id}-none`}
                            checked={selectedInGroup.length === 0}
                            onChange={() => clearGroupSelection(group.id)}
                            className="h-4 w-4 accent-orange-500"
                          />
                          Sem adicional
                        </label>
                      </li>
                    ) : null}
                    {group.options.map((option) => {
                      const checked = selectedAddonIds.includes(option.addon.id);
                      return (
                        <li key={option.addon.id}>
                          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-3">
                            <span className="flex items-center gap-3 text-sm text-stone-100">
                              <input
                                type={useRadio ? "radio" : "checkbox"}
                                name={
                                  useRadio
                                    ? `addon-group-${group.id}`
                                    : undefined
                                }
                                data-testid={`menu-addon-option-${option.addon.id}`}
                                checked={checked}
                                onChange={() =>
                                  selectGroupOption(
                                    group.id,
                                    option.addon.id,
                                    group.maxSelection,
                                  )
                                }
                                className="h-4 w-4 accent-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
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
                        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-3">
                          <span className="flex items-center gap-3 text-sm text-stone-100">
                            <input
                              type="checkbox"
                              data-testid={`menu-addon-option-${addon.id}`}
                              checked={checked}
                              onChange={() => toggleIndependentAddon(addon.id)}
                              className="h-4 w-4 accent-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
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

        {clientError ? (
          <p role="alert" className="text-sm text-red-300">
            {clientError}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-stone-300">Quantidade</p>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-800 text-lg ring-1 ring-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <span className="min-w-6 text-center text-sm font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(99, value + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-800 text-lg ring-1 ring-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          data-testid="add-to-cart-button"
          onClick={handleConfirm}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          Adicionar ao carrinho · {formatMoney(previewTotal)}
        </button>
      </div>
    </div>
  );
}
