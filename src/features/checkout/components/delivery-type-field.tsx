"use client";

import type {
  FieldErrors,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";
import type { CheckoutFormValues } from "@/features/checkout/checkout-schema";

type DeliveryTypeFieldProps = {
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
  watch: UseFormWatch<CheckoutFormValues>;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
};

export function DeliveryTypeField({
  register,
  errors,
  watch,
  pickupEnabled,
  deliveryEnabled,
}: DeliveryTypeFieldProps) {
  const deliveryType = watch("deliveryType");

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold text-orange-50">
        Como prefere receber?
      </legend>

      <div className="grid grid-cols-2 gap-2">
        <label
          className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-3 text-sm font-medium ${
            deliveryType === "PICKUP"
              ? "border-orange-400 bg-orange-500/15 text-orange-100"
              : "border-stone-700 bg-stone-900 text-stone-300"
          } ${!pickupEnabled ? "cursor-not-allowed opacity-40" : ""}`}
        >
          <input
            type="radio"
            value="PICKUP"
            disabled={!pickupEnabled}
            className="sr-only"
            {...register("deliveryType")}
          />
          Retirada
        </label>

        <label
          className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-3 text-sm font-medium ${
            deliveryType === "DELIVERY"
              ? "border-orange-400 bg-orange-500/15 text-orange-100"
              : "border-stone-700 bg-stone-900 text-stone-300"
          } ${!deliveryEnabled ? "cursor-not-allowed opacity-40" : ""}`}
        >
          <input
            type="radio"
            value="DELIVERY"
            disabled={!deliveryEnabled}
            className="sr-only"
            {...register("deliveryType")}
          />
          Entrega
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
