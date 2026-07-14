"use client";

import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import type { CheckoutFormValues } from "@/features/checkout/checkout-schema";
import type { CheckoutPaymentMethod } from "@/features/checkout/types";

const PAYMENT_OPTIONS: Array<{
  value: CheckoutPaymentMethod;
  label: string;
}> = [
  { value: "PIX", label: "Pix" },
  { value: "CASH", label: "Dinheiro" },
  { value: "DEBIT_CARD", label: "Débito" },
  { value: "CREDIT_CARD", label: "Crédito" },
];

type PaymentMethodFieldProps = {
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
  watch: UseFormWatch<CheckoutFormValues>;
  setValue: UseFormSetValue<CheckoutFormValues>;
};

export function PaymentMethodField({
  register,
  errors,
  watch,
  setValue,
}: PaymentMethodFieldProps) {
  const paymentMethod = watch("paymentMethod");
  const needsChange = watch("needsChange");

  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900/50 p-4">
      <div>
        <legend className="px-1 text-base font-semibold text-orange-50">
          Como prefere pagar?
        </legend>
        <p className="mt-2 px-1 text-xs text-stone-500">
          O pagamento será combinado e confirmado pelo WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PAYMENT_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 py-3 text-sm font-semibold ${
              paymentMethod === option.value
                ? "border-orange-400 bg-orange-500/15 text-orange-100 ring-1 ring-orange-400/30"
                : "border-stone-700 bg-stone-950 text-stone-300"
            }`}
          >
            <input
              type="radio"
              value={option.value}
              className="sr-only"
              {...register("paymentMethod", {
                onChange: (event) => {
                  if (event.target.value !== "CASH") {
                    setValue("needsChange", false);
                    setValue("changeFor", "");
                  }
                },
              })}
            />
            {option.label}
          </label>
        ))}
      </div>

      {errors.paymentMethod ? (
        <span className="text-xs text-red-400">
          {errors.paymentMethod.message}
        </span>
      ) : null}

      {paymentMethod === "CASH" ? (
        <div className="flex flex-col gap-3 rounded-xl border border-stone-800 bg-stone-950/80 p-3">
          <label className="flex items-center gap-3 text-sm text-stone-200">
            <input
              type="checkbox"
              {...register("needsChange")}
              className="size-4 accent-orange-500"
            />
            Preciso de troco
          </label>

          {needsChange ? (
            <label className="flex flex-col gap-1.5 text-sm text-stone-300">
              Troco para quanto?
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 50"
                {...register("changeFor")}
                className="h-11 rounded-xl border border-stone-700 bg-stone-900 px-3 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
              />
              {errors.changeFor ? (
                <span className="text-xs text-red-400">
                  {errors.changeFor.message}
                </span>
              ) : null}
            </label>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}
