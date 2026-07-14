"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { UserRole } from "@prisma/client";
import {
  canLinkMenuAddonToProduct,
  canToggleMenuAddonActive,
  canUnlinkMenuAddonFromProduct,
  canUpdateMenuAddon,
} from "@/features/admin/auth/admin-permissions";
import { linkAddonToProductAction } from "@/features/admin/addons/actions/link-addon-to-product-action";
import { toggleAddonActiveAction } from "@/features/admin/addons/actions/toggle-addon-active-action";
import { unlinkAddonFromProductAction } from "@/features/admin/addons/actions/unlink-addon-from-product-action";
import { formatAdminPriceCents } from "@/features/admin/menu/admin-menu-formatters";
import type {
  AdminAddon,
  AdminAddonLinkProductOption,
} from "@/features/admin/addons/admin-addons.types";
import { AddonForm } from "@/features/admin/addons/components/addon-form";

type AddonProductLinksProps = {
  addon: AdminAddon;
  products: AdminAddonLinkProductOption[];
  canLink: boolean;
  canUnlink: boolean;
};

export function AddonProductLinks({
  addon,
  products,
  canLink,
  canUnlink,
}: AddonProductLinksProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canLink && !canUnlink) {
    return (
      <div className="mt-3 text-xs text-stone-500">
        Produtos vinculados:{" "}
        {addon.linkedProducts.length === 0
          ? "nenhum"
          : addon.linkedProducts.map((p) => p.name).join(", ")}
      </div>
    );
  }

  function onLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(event.currentTarget);
    const productId = String(formData.get("productId") ?? "");

    startTransition(async () => {
      const result = await linkAddonToProductAction({
        addonId: addon.id,
        productId,
      });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  function unlink(productId: string) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await unlinkAddonFromProductAction({
        addonId: addon.id,
        productId,
      });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  const linkableProducts = products.filter(
    (product) => !addon.linkedProducts.some((linked) => linked.id === product.id),
  );

  return (
    <div
      data-testid={`admin-addons-links-${addon.id}`}
      className="mt-4 border-t border-stone-800 pt-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Vínculos com produtos
      </p>
      {canLink ? (
        <form
          method="post"
          action="#"
          onSubmit={onLink}
          className="mt-2 flex flex-wrap items-end gap-2"
        >
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-stone-400">
            Produto
            <select
              name="productId"
              required
              data-testid={`admin-addons-link-select-${addon.id}`}
              className="h-9 rounded-lg border border-stone-700 bg-stone-950 px-2 text-sm text-stone-100"
            >
              <option value="">Selecione…</option>
              {linkableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={isPending || linkableProducts.length === 0}
            data-testid={`admin-addons-link-submit-${addon.id}`}
            className="h-9 rounded-lg border border-stone-600 px-3 text-xs font-medium text-stone-100 disabled:opacity-50"
          >
            Vincular
          </button>
        </form>
      ) : null}
      <ul className="mt-3 flex flex-col gap-2">
        {addon.linkedProducts.length === 0 ? (
          <li className="text-xs text-stone-500">Nenhum produto vinculado.</li>
        ) : (
          addon.linkedProducts.map((product) => (
            <li
              key={product.id}
              data-testid={`admin-addons-linked-product-${addon.id}-${product.id}`}
              className="flex items-center justify-between gap-2 text-sm text-stone-300"
            >
              <span>{product.name}</span>
              {canUnlink ? (
                <button
                  type="button"
                  disabled={isPending}
                  data-testid={`admin-addons-unlink-${addon.id}-${product.id}`}
                  onClick={() => unlink(product.id)}
                  className="text-xs text-red-300 underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Desvincular
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
      {errorMessage ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

type AddonListProps = {
  addons: AdminAddon[];
  products: AdminAddonLinkProductOption[];
  role: UserRole;
};

export function AddonList({ addons, products, role }: AddonListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canUpdate = canUpdateMenuAddon(role);
  const canToggle = canToggleMenuAddonActive(role);
  const canLink = canLinkMenuAddonToProduct(role);
  const canUnlink = canUnlinkMenuAddonFromProduct(role);

  function toggleActive(addonId: string, active: boolean) {
    startTransition(async () => {
      const result = await toggleAddonActiveAction({ addonId, active });
      if (result.ok) {
        router.refresh();
      }
    });
  }

  if (addons.length === 0) {
    return (
      <p
        data-testid="admin-addons-empty"
        className="rounded-2xl border border-dashed border-stone-700 px-5 py-8 text-center text-sm text-stone-400"
      >
        Nenhum adicional cadastrado para esta loja.
      </p>
    );
  }

  return (
    <ul
      data-testid="admin-addons-list"
      className="flex flex-col gap-4"
    >
      {addons.map((addon) => (
        <li
          key={addon.id}
          data-testid={`admin-addon-${addon.id}`}
          className="rounded-2xl border border-stone-800 bg-stone-900/50 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-stone-100">{addon.name}</p>
              {addon.description ? (
                <p className="mt-1 text-xs text-stone-400">{addon.description}</p>
              ) : null}
              <p className="mt-2 text-sm font-semibold text-orange-200">
                {formatAdminPriceCents(addon.priceCents)}
              </p>
              <p
                data-testid={`admin-addon-status-${addon.id}`}
                className="mt-2 text-xs text-stone-500"
              >
                {addon.active ? "Ativo" : "Inativo"}
              </p>
            </div>
            {canToggle ? (
              <button
                type="button"
                data-testid={`admin-addon-toggle-active-${addon.id}`}
                disabled={isPending}
                onClick={() => toggleActive(addon.id, !addon.active)}
                className="h-9 rounded-lg border border-stone-700 px-3 text-xs font-medium text-stone-200 disabled:opacity-60"
              >
                {addon.active ? "Desativar" : "Ativar"}
              </button>
            ) : null}
          </div>

          <AddonProductLinks
            addon={addon}
            products={products}
            canLink={canLink}
            canUnlink={canUnlink}
          />

          {canUpdate ? (
            <div className="mt-4 border-t border-stone-800 pt-4">
              <AddonForm mode="edit" addon={addon} canSubmit={canUpdate} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
