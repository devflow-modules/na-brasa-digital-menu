"use client";

import type {
  FieldErrors,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";
import { formatMoney } from "@/features/menu/format-money";
import type { CheckoutFormValues } from "@/features/checkout/checkout-schema";

type DeliveryTypeFieldProps = {
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
  watch: UseFormWatch<CheckoutFormValues>;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeCents: number;
};

export function DeliveryTypeField({
  register,
  errors,
  watch,
  pickupEnabled,
  deliveryEnabled,
  deliveryFeeCents,
}: DeliveryTypeFieldProps) {
  const deliveryType = watch("deliveryType");

  const deliveryFeeHint =
    deliveryFeeCents > 0
      ? `Taxa ${formatMoney(deliveryFeeCents)}`
      : "Sem taxa";

  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900/50 p-4">
      <legend className="px-1 text-base font-semibold text-orange-50">
        Como você quer receber?
      </legend>

      <div className="grid grid-cols-2 gap-2">
        <label
          className={`flex min-h-[4.5rem] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-3 text-center ${
            deliveryType === "PICKUP"
              ? "border-orange-400 bg-orange-500/15 text-orange-100 ring-1 ring-orange-400/30"
              : "border-stone-700 bg-stone-950 text-stone-300"
          } ${!pickupEnabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input
            type="radio"
            value="PICKUP"
            disabled={!pickupEnabled}
            className="sr-only"
            {...register("deliveryType")}
          />
          <span className="text-sm font-semibold">Retirada</span>
          <span className="text-[11px] text-stone-400">
            {pickupEnabled ? "Buscar no local" : "Indisponível"}
          </span>
        </label>

        <label
          className={`flex min-h-[4.5rem] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-3 text-center ${
            deliveryType === "DELIVERY"
              ? "border-orange-400 bg-orange-500/15 text-orange-100 ring-1 ring-orange-400/30"
              : "border-stone-700 bg-stone-950 text-stone-300"
          } ${!deliveryEnabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input
            type="radio"
            value="DELIVERY"
            disabled={!deliveryEnabled}
            className="sr-only"
            {...register("deliveryType")}
          />
          <span className="text-sm font-semibold">Entrega</span>
          <span className="text-[11px] text-stone-400">
            {deliveryEnabled
              ? `Receber em casa · ${deliveryFeeHint}`
              : "Indisponível"}
          </span>
        </label>
      </div>

      {errors.deliveryType ? (
        <span className="text-xs text-red-400">
          {errors.deliveryType.message}
        </span>
      ) : null}
    </fieldset>
  );
}
