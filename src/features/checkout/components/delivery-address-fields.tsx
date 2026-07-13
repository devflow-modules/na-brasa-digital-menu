"use client";

import type {
  FieldErrors,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";
import type { CheckoutFormValues } from "@/features/checkout/checkout-schema";

type DeliveryAddressFieldsProps = {
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
  watch: UseFormWatch<CheckoutFormValues>;
};

export function DeliveryAddressFields({
  register,
  errors,
  watch,
}: DeliveryAddressFieldsProps) {
  const deliveryType = watch("deliveryType");

  if (deliveryType !== "DELIVERY") {
    return null;
  }

  return (
    <label className="flex flex-col gap-1.5 text-sm text-stone-300">
      Endereço de entrega
      <textarea
        rows={3}
        placeholder="Rua, número, bairro, ponto de referência"
        {...register("deliveryAddress")}
        className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
      />
      {errors.deliveryAddress ? (
        <span className="text-xs text-red-400">
          {errors.deliveryAddress.message}
        </span>
      ) : null}
    </label>
  );
}
