"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { linkAddonToProductAction } from "@/features/admin/addons/actions/link-addon-to-product-action";
import { unlinkAddonFromProductAction } from "@/features/admin/addons/actions/unlink-addon-from-product-action";
import type {
  AdminAddon,
  AdminAddonLinkProductOption,
} from "@/features/admin/addons/admin-addons.types";

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
      <div
        data-testid={`admin-addons-links-${addon.id}`}
        className="text-sm text-stone-400"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Produtos vinculados
        </p>
        <p className="mt-2">
          {addon.linkedProducts.length === 0
            ? "Nenhum produto vinculado."
            : addon.linkedProducts.map((product) => product.name).join(", ")}
        </p>
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
    (product) =>
      !addon.linkedProducts.some((linked) => linked.id === product.id),
  );

  return (
    <div
      data-testid={`admin-addons-links-${addon.id}`}
      className="space-y-3"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Produtos vinculados
      </p>
      <ul className="flex flex-col gap-2">
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
                  Remover
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
      {canLink ? (
        <form
          method="post"
          action="#"
          onSubmit={onLink}
          className="flex flex-wrap items-end gap-2"
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
      {errorMessage ? (
        <p role="alert" className="text-xs text-red-300">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
