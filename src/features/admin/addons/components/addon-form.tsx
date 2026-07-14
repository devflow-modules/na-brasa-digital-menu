"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { createAddonAction } from "@/features/admin/addons/actions/create-addon-action";
import { updateAddonAction } from "@/features/admin/addons/actions/update-addon-action";
import { formatPriceCentsForInput } from "@/features/admin/menu/admin-menu-formatters";
import type { AdminAddon } from "@/features/admin/addons/admin-addons.types";

type AddonFormProps = {
  mode: "create" | "edit";
  addon?: AdminAddon;
  canSubmit: boolean;
};

export function AddonForm({ mode, addon, canSubmit }: AddonFormProps) {
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
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      priceCents: String(formData.get("priceCents") ?? ""),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      isActive: formData.get("isActive") === "on",
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createAddonAction(payload)
          : await updateAddonAction({
              ...payload,
              addonId: addon?.id ?? "",
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
      ? "admin-addons-create-form"
      : `admin-addons-edit-form-${addon?.id}`;

  return (
    <form
      data-testid={testId}
      method="post"
      action="#"
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
    >
      <h3 className="text-sm font-semibold text-orange-50">
        {mode === "create" ? "Novo adicional" : `Editar adicional — ${addon?.name}`}
      </h3>
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Nome
        <input
          name="name"
          required
          defaultValue={addon?.name ?? ""}
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Descrição (opcional)
        <input
          name="description"
          defaultValue={addon?.description ?? ""}
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Preço (R$)
        <input
          name="priceCents"
          required
          defaultValue={
            addon ? formatPriceCentsForInput(addon.priceCents) : ""
          }
          placeholder="0,00"
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Ordem
        <input
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={addon?.sortOrder ?? 0}
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={addon?.active ?? true}
          className="size-4 rounded border-stone-600"
        />
        Ativo no cardápio
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : mode === "create" ? "Criar adicional" : "Salvar adicional"}
      </button>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-300">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
