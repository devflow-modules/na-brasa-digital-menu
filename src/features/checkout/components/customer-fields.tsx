"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { CheckoutFormValues } from "@/features/checkout/checkout-schema";

type CustomerFieldsProps = {
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
};

export function CustomerFields({ register, errors }: CustomerFieldsProps) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900/50 p-4">
      <legend className="px-1 text-base font-semibold text-orange-50">
        Seus dados para contato
      </legend>

      <label className="flex flex-col gap-1.5 text-sm text-stone-300">
        Nome
        <input
          type="text"
          autoComplete="name"
          placeholder="Seu nome"
          {...register("customerName")}
          className="h-11 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
        />
        {errors.customerName ? (
          <span className="text-xs text-red-400">
            {errors.customerName.message}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-stone-300">
        WhatsApp para contato
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(13) 99999-9999"
          {...register("customerPhone")}
          className="h-11 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
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
