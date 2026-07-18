"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { updateStoreSettingsAction } from "@/features/admin/settings/actions/update-store-settings-action";
import { formatPriceCentsForInput } from "@/features/admin/menu/admin-menu-formatters";
import { MODALITY_REQUIRED_MESSAGE } from "@/features/admin/settings/admin-store-settings.schema";
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
  const [pickupEnabled, setPickupEnabled] = useState(settings.pickupEnabled);
  const [deliveryEnabled, setDeliveryEnabled] = useState(
    settings.deliveryEnabled,
  );
  const [isPending, startTransition] = useTransition();

  const modalitiesInvalid = !pickupEnabled && !deliveryEnabled;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (modalitiesInvalid) {
      setErrorMessage(MODALITY_REQUIRED_MESSAGE);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      whatsapp: String(formData.get("whatsapp") ?? ""),
      address: String(formData.get("address") ?? ""),
      openingHours: String(formData.get("openingHours") ?? ""),
      deliveryFeeCents: String(formData.get("deliveryFeeCents") ?? ""),
      minimumOrderAmountCents: String(
        formData.get("minimumOrderAmountCents") ?? "",
      ),
      pickupEnabled,
      deliveryEnabled,
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
      className="flex flex-col gap-6 rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
    >
      <section className="flex flex-col gap-4" aria-labelledby="settings-operation">
        <div>
          <h2
            id="settings-operation"
            className="text-sm font-semibold text-orange-50"
          >
            Operação
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            Define se a loja aceita pedidos e quais modalidades o cliente pode
            escolher.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm text-stone-300">
          <span className="flex items-center gap-2">
            <input
              name="isOpen"
              type="checkbox"
              defaultChecked={settings.isOpen}
              disabled={!canSubmit}
              className="size-4 rounded border-stone-600"
            />
            Loja aberta
          </span>
          <span id="isOpen-hint" className="pl-6 text-xs text-stone-500">
            Bloqueia novos pedidos Online. Pedidos de Balcão autorizados podem
            continuar. Horário de funcionamento é só informativo.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm text-stone-300">
          <span className="flex items-center gap-2">
            <input
              name="pickupEnabled"
              type="checkbox"
              checked={pickupEnabled}
              disabled={!canSubmit}
              onChange={(event) => setPickupEnabled(event.target.checked)}
              aria-describedby="pickup-hint"
              className="size-4 rounded border-stone-600"
            />
            Retirada habilitada
          </span>
          <span id="pickup-hint" className="pl-6 text-xs text-stone-500">
            Permite que clientes retirem pedidos no estabelecimento.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm text-stone-300">
          <span className="flex items-center gap-2">
            <input
              name="deliveryEnabled"
              type="checkbox"
              checked={deliveryEnabled}
              disabled={!canSubmit}
              onChange={(event) => setDeliveryEnabled(event.target.checked)}
              aria-describedby="delivery-hint"
              className="size-4 rounded border-stone-600"
            />
            Entrega habilitada
          </span>
          <span id="delivery-hint" className="pl-6 text-xs text-stone-500">
            Permite pedidos com entrega.
          </span>
        </label>

        {modalitiesInvalid ? (
          <p
            data-testid="admin-store-settings-modality-error"
            role="alert"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          >
            {MODALITY_REQUIRED_MESSAGE}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="settings-delivery">
        <div>
          <h2
            id="settings-delivery"
            className="text-sm font-semibold text-orange-50"
          >
            Entrega
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            {deliveryEnabled
              ? "Valores aplicados aos pedidos com entrega."
              : "Entrega desabilitada. Estes valores serão aplicados quando a entrega for reativada."}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm text-stone-300">
          Taxa de entrega (R$)
          <input
            name="deliveryFeeCents"
            required
            readOnly={!canSubmit}
            defaultValue={formatPriceCentsForInput(settings.deliveryFeeCents)}
            aria-describedby="delivery-fee-hint"
            className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 read-only:opacity-80"
          />
          <span id="delivery-fee-hint" className="text-xs text-stone-500">
            Use R$ 0,00 para entrega sem taxa.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm text-stone-300">
          Pedido mínimo para entrega
          <input
            name="minimumOrderAmountCents"
            required
            readOnly={!canSubmit}
            defaultValue={formatPriceCentsForInput(
              settings.minimumOrderAmountCents,
            )}
            aria-describedby="minimum-order-hint"
            data-testid="admin-store-minimum-order-input"
            className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 read-only:opacity-80"
          />
          <span id="minimum-order-hint" className="text-xs text-stone-500">
            Aplicado somente a pedidos com entrega. Use R$ 0,00 para não exigir
            valor mínimo.
          </span>
        </label>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="settings-contact">
        <div>
          <h2
            id="settings-contact"
            className="text-sm font-semibold text-orange-50"
          >
            Contato e localização
          </h2>
        </div>

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
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="settings-hours">
        <div>
          <h2
            id="settings-hours"
            className="text-sm font-semibold text-orange-50"
          >
            Horário
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            Texto informativo exibido no cardápio.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm text-stone-300">
          Horário / funcionamento
          <textarea
            name="openingHours"
            rows={3}
            readOnly={!canSubmit}
            defaultValue={settings.openingHours ?? ""}
            aria-describedby="opening-hours-hint"
            className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 read-only:opacity-80"
          />
          <span id="opening-hours-hint" className="text-xs text-stone-500">
            Este horário é exibido para o cliente. A abertura da loja é
            controlada pelo campo “Loja aberta”.
          </span>
        </label>
      </section>

      {canSubmit ? (
        <button
          type="submit"
          data-testid="admin-store-settings-save"
          disabled={isPending || modalitiesInvalid}
          className="h-10 rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar configurações"}
        </button>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          data-testid="admin-store-settings-error"
          className="text-sm text-red-300"
        >
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p
          data-testid="admin-store-settings-success"
          className="text-sm text-emerald-300"
        >
          {successMessage}
        </p>
      ) : null}
    </form>
  );
}
