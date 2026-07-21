"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { updateStoreSettingsAction } from "@/features/admin/settings/actions/update-store-settings-action";
import { formatPriceCentsForInput } from "@/features/admin/menu/admin-menu-formatters";
import { MODALITY_REQUIRED_MESSAGE } from "@/features/admin/settings/admin-store-settings.schema";
import type { AdminStoreSettings } from "@/features/admin/settings/admin-store-settings.types";
import {
  formatWhatsappForDisplay,
  getWhatsappInputStatus,
  normalizeWhatsappDigits,
  whatsappStatusMessage,
} from "@/features/admin/settings/admin-store-whatsapp";
import { SettingsSwitch } from "@/features/admin/settings/components/settings-switch";

type StoreSettingsFormProps = {
  settings: AdminStoreSettings;
  canSubmit: boolean;
};

type FormValues = {
  whatsapp: string;
  address: string;
  openingHours: string;
  deliveryFeeCents: string;
  minimumOrderAmountCents: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
};

function valuesFromSettings(settings: AdminStoreSettings): FormValues {
  return {
    whatsapp: formatWhatsappForDisplay(settings.whatsapp),
    address: settings.address ?? "",
    openingHours: settings.openingHours ?? "",
    deliveryFeeCents: formatPriceCentsForInput(settings.deliveryFeeCents),
    minimumOrderAmountCents: formatPriceCentsForInput(
      settings.minimumOrderAmountCents,
    ),
    pickupEnabled: settings.pickupEnabled,
    deliveryEnabled: settings.deliveryEnabled,
  };
}

function areFormValuesEqual(a: FormValues, b: FormValues): boolean {
  return (
    normalizeWhatsappDigits(a.whatsapp) === normalizeWhatsappDigits(b.whatsapp) &&
    a.address.trim() === b.address.trim() &&
    a.openingHours.trim() === b.openingHours.trim() &&
    a.deliveryFeeCents.trim() === b.deliveryFeeCents.trim() &&
    a.minimumOrderAmountCents.trim() === b.minimumOrderAmountCents.trim() &&
    a.pickupEnabled === b.pickupEnabled &&
    a.deliveryEnabled === b.deliveryEnabled
  );
}

export function StoreSettingsForm({
  settings,
  canSubmit,
}: StoreSettingsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() =>
    valuesFromSettings(settings),
  );
  const [baseline, setBaseline] = useState<FormValues>(() =>
    valuesFromSettings(settings),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const next = valuesFromSettings(settings);
    setValues(next);
    setBaseline(next);
  }, [settings]);

  const isDirty = useMemo(
    () => !areFormValuesEqual(values, baseline),
    [values, baseline],
  );
  const modalitiesInvalid = !values.pickupEnabled && !values.deliveryEnabled;
  const whatsappStatus = getWhatsappInputStatus(values.whatsapp);
  const whatsappHint = whatsappStatusMessage(whatsappStatus);
  const whatsappInvalidForSubmit =
    whatsappStatus !== "valid" && canSubmit && isDirty;
  const canSave =
    canSubmit &&
    isDirty &&
    !isPending &&
    !modalitiesInvalid &&
    whatsappStatus === "valid";

  function updateField<K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) {
    setSuccessMessage(null);
    setErrorMessage(null);
    setValues((current) => ({ ...current, [key]: value }));
  }

  function discardChanges() {
    setValues(baseline);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (modalitiesInvalid) {
      setErrorMessage(MODALITY_REQUIRED_MESSAGE);
      return;
    }

    const payload = {
      whatsapp: normalizeWhatsappDigits(values.whatsapp),
      address: values.address,
      openingHours: values.openingHours,
      deliveryFeeCents: values.deliveryFeeCents,
      minimumOrderAmountCents: values.minimumOrderAmountCents,
      pickupEnabled: values.pickupEnabled,
      deliveryEnabled: values.deliveryEnabled,
    };

    startTransition(async () => {
      const result = await updateStoreSettingsAction(payload);
      if (!result.ok) {
        setErrorMessage(result.message || "Erro ao salvar");
        return;
      }
      setBaseline(values);
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
      className="flex flex-col gap-6"
    >
      <section
        className="flex flex-col gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
        aria-labelledby="settings-modalities"
      >
        <div>
          <h2
            id="settings-modalities"
            className="text-sm font-semibold text-orange-50"
          >
            Modalidades de atendimento
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            Define o que o cliente pode escolher no checkout.
          </p>
        </div>

        <SettingsSwitch
          testId="admin-store-pickup-switch"
          label="Retirada"
          description="Clientes poderão escolher retirada no checkout."
          checked={values.pickupEnabled}
          disabled={!canSubmit}
          onCheckedChange={(checked) => updateField("pickupEnabled", checked)}
        />

        <SettingsSwitch
          testId="admin-store-delivery-switch"
          label="Entrega"
          description="Clientes poderão escolher entrega no checkout."
          checked={values.deliveryEnabled}
          disabled={!canSubmit}
          onCheckedChange={(checked) => updateField("deliveryEnabled", checked)}
        />

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

      <section
        className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
        aria-labelledby="settings-delivery"
      >
        <div>
          <h2
            id="settings-delivery"
            className="text-sm font-semibold text-orange-50"
          >
            Configurações de entrega
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            {values.deliveryEnabled
              ? "Valores aplicados aos pedidos com entrega."
              : "Entrega desativada. Os campos de taxa e pedido mínimo ficam indisponíveis."}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm text-stone-300">
          Taxa de entrega (R$)
          <input
            name="deliveryFeeCents"
            required
            disabled={!canSubmit || !values.deliveryEnabled}
            value={values.deliveryFeeCents}
            onChange={(event) =>
              updateField("deliveryFeeCents", event.target.value)
            }
            aria-describedby="delivery-fee-hint"
            className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
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
            disabled={!canSubmit || !values.deliveryEnabled}
            value={values.minimumOrderAmountCents}
            onChange={(event) =>
              updateField("minimumOrderAmountCents", event.target.value)
            }
            aria-describedby="minimum-order-hint"
            data-testid="admin-store-minimum-order-input"
            className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span id="minimum-order-hint" className="text-xs text-stone-500">
            Aplicado somente a pedidos com entrega. Use R$ 0,00 para não exigir
            valor mínimo.
          </span>
        </label>
      </section>

      <section
        className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
        aria-labelledby="settings-contact"
      >
        <div>
          <h2
            id="settings-contact"
            className="text-sm font-semibold text-orange-50"
          >
            Contato e localização
          </h2>
        </div>

        <label className="flex flex-col gap-1 text-sm text-stone-300">
          WhatsApp
          <input
            name="whatsapp"
            required
            readOnly={!canSubmit}
            inputMode="tel"
            autoComplete="tel"
            value={values.whatsapp}
            onChange={(event) => {
              const digits = normalizeWhatsappDigits(event.target.value).slice(
                0,
                13,
              );
              updateField("whatsapp", formatWhatsappForDisplay(digits));
            }}
            aria-describedby="whatsapp-hint"
            data-testid="admin-store-whatsapp-input"
            className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 read-only:opacity-80"
          />
          <span
            id="whatsapp-hint"
            data-testid="admin-store-whatsapp-hint"
            className={[
              "text-xs",
              whatsappStatus === "valid"
                ? "text-emerald-400"
                : whatsappInvalidForSubmit || whatsappStatus === "too_long"
                  ? "text-amber-300"
                  : "text-stone-500",
            ].join(" ")}
          >
            {whatsappHint}
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm text-stone-300">
          Endereço
          <input
            name="address"
            readOnly={!canSubmit}
            value={values.address}
            onChange={(event) => updateField("address", event.target.value)}
            className="h-10 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 read-only:opacity-80"
          />
        </label>
      </section>

      <section
        className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
        aria-labelledby="settings-hours"
      >
        <div>
          <h2
            id="settings-hours"
            className="text-sm font-semibold text-orange-50"
          >
            Informações exibidas ao cliente
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            Texto informativo. Não abre nem fecha a loja automaticamente.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm text-stone-300">
          Descrição do horário de funcionamento
          <textarea
            name="openingHours"
            rows={3}
            readOnly={!canSubmit}
            value={values.openingHours}
            onChange={(event) =>
              updateField("openingHours", event.target.value)
            }
            aria-describedby="opening-hours-hint"
            className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 read-only:opacity-80"
          />
          <span id="opening-hours-hint" className="text-xs text-stone-500">
            Texto exibido ao cliente. A regra real de aceitar pedidos é o status
            “Loja aberta”.
          </span>
        </label>
      </section>

      {canSubmit ? (
        <div className="flex flex-col gap-3">
          {isDirty ? (
            <p
              data-testid="admin-store-settings-dirty"
              className="text-sm text-amber-200"
            >
              Você possui alterações não salvas.
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              data-testid="admin-store-settings-discard"
              disabled={!isDirty || isPending}
              onClick={discardChanges}
              className="h-10 rounded-xl border border-stone-600 px-4 text-sm font-semibold text-stone-200 disabled:opacity-40"
            >
              Descartar alterações
            </button>
            <button
              type="submit"
              data-testid="admin-store-settings-save"
              disabled={!canSave}
              className="h-10 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-stone-950 disabled:opacity-60"
            >
              {isPending ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        </div>
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
