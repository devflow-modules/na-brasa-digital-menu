"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { createCategoryAction } from "@/features/admin/menu/actions/create-category-action";
import { updateCategoryAction } from "@/features/admin/menu/actions/update-category-action";
import type { AdminMenuCategory } from "@/features/admin/menu/admin-menu.types";

type CategoryFormProps = {
  mode: "create" | "edit";
  category?: AdminMenuCategory;
  canManage: boolean;
};

export function CategoryForm({ mode, category, canManage }: CategoryFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManage) {
    return null;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const payload = {
        name: String(formData.get("name") ?? ""),
        sortOrder: Number(formData.get("sortOrder") ?? 0),
        isActive: formData.get("isActive") === "on",
      };

      const result =
        mode === "create"
          ? await createCategoryAction(payload)
          : await updateCategoryAction({
              ...payload,
              categoryId: category?.id ?? "",
            });

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      router.refresh();
    });
  }

  const testId =
    mode === "create"
      ? "admin-menu-create-category-form"
      : `admin-menu-edit-category-form-${category?.id}`;

  return (
    <form
      data-testid={testId}
      method="post"
      action="#"
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
    >
      <h3 className="text-sm font-semibold text-orange-50">
        {mode === "create" ? "Nova categoria" : `Editar categoria — ${category?.name}`}
      </h3>
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Nome
        <input
          name="name"
          required
          defaultValue={category?.name ?? ""}
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Ordem
        <input
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={category?.sortOrder ?? 0}
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={category?.active ?? true}
          className="size-4 rounded border-stone-600"
        />
        Categoria ativa
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : mode === "create" ? "Criar categoria" : "Salvar categoria"}
      </button>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-300">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
