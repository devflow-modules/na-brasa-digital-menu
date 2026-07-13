"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { CheckoutFormValues } from "@/features/checkout/checkout-schema";

type CustomerFieldsProps = {
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
};

export function CustomerFields({ register, errors }: CustomerFieldsProps) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold text-orange-50">
        Seus dados
      </legend>

      <label className="flex flex-col gap-1.5 text-sm text-stone-300">
        Nome
        <input
          type="text"
          autoComplete="name"
          {...register("customerName")}
          className="h-11 rounded-xl border border-stone-700 bg-stone-900 px-3 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
        />
        {errors.customerName ? (
          <span className="text-xs text-red-400">
            {errors.customerName.message}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-stone-300">
        WhatsApp / telefone
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="11999999999"
          {...register("customerPhone")}
          className="h-11 rounded-xl border border-stone-700 bg-stone-900 px-3 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
        />
        {errors.customerPhone ? (
          <span className="text-xs text-red-400">
            {errors.customerPhone.message}
          </span>
        ) : null}
      </label>
    </fieldset>
  );
}
