"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { createProductAction } from "@/features/admin/menu/actions/create-product-action";
import { updateProductAction } from "@/features/admin/menu/actions/update-product-action";
import { formatPriceCentsForInput } from "@/features/admin/menu/admin-menu-formatters";
import type { AdminMenuCategory, AdminMenuProduct } from "@/features/admin/menu/admin-menu.types";

type ProductFormProps = {
  mode: "create" | "edit";
  categories: AdminMenuCategory[];
  product?: AdminMenuProduct;
  defaultCategoryId?: string;
  canSubmit: boolean;
};

export function ProductForm({
  mode,
  categories,
  product,
  defaultCategoryId,
  canSubmit,
}: ProductFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canSubmit) {
    return null;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      categoryId: String(formData.get("categoryId") ?? ""),
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      priceCents: String(formData.get("priceCents") ?? ""),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      isActive: formData.get("isActive") === "on",
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProductAction(payload)
          : await updateProductAction({
              ...payload,
              productId: product?.id ?? "",
            });

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      if (mode === "create") {
        form.reset();
      }
      router.refresh();
    });
  }

  const testId =
    mode === "create"
      ? "admin-menu-create-product-form"
      : `admin-menu-edit-product-form-${product?.id}`;

  return (
    <form
      data-testid={testId}
      method="post"
      action="#"
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
    >
      <h3 className="text-sm font-semibold text-orange-50">
        {mode === "create" ? "Novo produto" : `Editar produto — ${product?.name}`}
      </h3>
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Categoria
        <select
          name="categoryId"
          required
          defaultValue={product?.categoryId ?? defaultCategoryId ?? ""}
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100"
        >
          <option value="" disabled>
            Selecione
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Nome
        <input
          name="name"
          required
          defaultValue={product?.name ?? ""}
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Descrição
        <textarea
          name="description"
          rows={2}
          defaultValue={product?.description ?? ""}
          className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Preço (R$)
        <input
          name="priceCents"
          required
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={
            product ? formatPriceCentsForInput(product.priceCents) : ""
          }
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Ordem
        <input
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={product?.sortOrder ?? 0}
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={product?.active ?? true}
          className="size-4 rounded border-stone-600"
        />
        Publicado no cardápio (oculto se desmarcado)
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : mode === "create" ? "Criar produto" : "Salvar produto"}
      </button>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-300">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
