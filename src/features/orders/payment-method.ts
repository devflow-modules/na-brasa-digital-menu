import type { PaymentMethod } from "@prisma/client";

/** Labels for every persisted PaymentMethod, including legacy CARD. */
export const paymentMethodLabels = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CARD: "Cartão — tipo não informado",
  DEBIT_CARD: "Cartão de débito",
  CREDIT_CARD: "Cartão de crédito",
} satisfies Record<PaymentMethod, string>;

/** Payment methods allowed on new order create / counter finalize. */
export const creatablePaymentMethods = [
  "CASH",
  "PIX",
  "DEBIT_CARD",
  "CREDIT_CARD",
] as const;

export type CreatablePaymentMethod = (typeof creatablePaymentMethods)[number];

export function formatPaymentMethodLabel(
  method: PaymentMethod | CreatablePaymentMethod,
): string {
  return paymentMethodLabels[method];
}
