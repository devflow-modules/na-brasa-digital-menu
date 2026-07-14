"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { updateStoreSettingsAction } from "@/features/admin/settings/actions/update-store-settings-action";
import { formatPriceCentsForInput } from "@/features/admin/menu/admin-menu-formatters";
import type { AdminStoreSettings } from "@/features/admin/settings/admin-store-settings.types";

type StoreSettingsFormProps = {
  settings: AdminStoreSettings;
  canSubmit: boolean;
};

export function StoreSettingsForm({
  settings,
  canSubmit,
}: StoreSettingsFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      whatsapp: String(formData.get("whatsapp") ?? ""),
      address: String(formData.get("address") ?? ""),
      openingHours: String(formData.get("openingHours") ?? ""),
      deliveryFeeCents: String(formData.get("deliveryFeeCents") ?? ""),
      pickupEnabled: formData.get("pickupEnabled") === "on",
      deliveryEnabled: formData.get("deliveryEnabled") === "on",
      isOpen: formData.get("isOpen") === "on",
    };

    startTransition(async () => {
      const result = await updateStoreSettingsAction(payload);
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      setSuccessMessage("Configurações salvas.");
      router.refresh();
    });
  }

  return (
    <form
      data-testid="admin-store-settings-form"
      method="post"
      action="#"
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
    >
      <h2 className="text-sm font-semibold text-orange-50">Dados da loja</h2>

      <label className="flex flex-col gap-1 text-sm text-stone-300">
        WhatsApp (somente números, com DDD)
        <input
          name="whatsapp"
          required
          readOnly={!canSubmit}
          defaultValue={settings.whatsapp}
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 read-only:opacity-80"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Endereço
        <input
          name="address"
          readOnly={!canSubmit}
          defaultValue={settings.address ?? ""}
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 read-only:opacity-80"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Horário / funcionamento
        <textarea
          name="openingHours"
          rows={3}
          readOnly={!canSubmit}
          defaultValue={settings.openingHours ?? ""}
          className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 read-only:opacity-80"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Taxa de entrega (R$)
        <input
          name="deliveryFeeCents"
          required
          readOnly={!canSubmit}
          defaultValue={formatPriceCentsForInput(settings.deliveryFeeCents)}
          className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 read-only:opacity-80"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          name="pickupEnabled"
          type="checkbox"
          defaultChecked={settings.pickupEnabled}
          disabled={!canSubmit}
          className="size-4 rounded border-stone-600"
        />
        Retirada habilitada
      </label>

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          name="deliveryEnabled"
          type="checkbox"
          defaultChecked={settings.deliveryEnabled}
          disabled={!canSubmit}
          className="size-4 rounded border-stone-600"
        />
        Entrega habilitada
      </label>

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          name="isOpen"
          type="checkbox"
          defaultChecked={settings.isOpen}
          disabled={!canSubmit}
          className="size-4 rounded border-stone-600"
        />
        Loja aberta para pedidos
      </label>

      {canSubmit ? (
        <button
          type="submit"
          data-testid="admin-store-settings-save"
          disabled={isPending}
          className="h-10 rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar configurações"}
        </button>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="text-sm text-red-300">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-emerald-300">{successMessage}</p>
      ) : null}
    </form>
  );
}
