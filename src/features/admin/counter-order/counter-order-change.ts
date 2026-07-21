/**
 * Pure helpers for COUNTER cash tender / change display.
 * `changeForCents` domain meaning: amount the customer handed over (CASH).
 * Omitted tender = exact payment (change 0).
 */

export function isCashTenderValid(
  totalCents: number,
  tenderedCents: number | null | undefined,
): boolean {
  if (tenderedCents == null) {
    return true;
  }

  return (
    Number.isInteger(tenderedCents) &&
    tenderedCents >= 0 &&
    tenderedCents >= totalCents
  );
}

export function computeCashChangeCents(
  totalCents: number,
  tenderedCents: number | null | undefined,
): number | null {
  if (!isCashTenderValid(totalCents, tenderedCents)) {
    return null;
  }

  if (tenderedCents == null) {
    return 0;
  }

  return tenderedCents - totalCents;
}

export function buildFinalizeCounterOrderPayload(input: {
  orderId: string;
  paymentMethod: "CASH" | "PIX" | "DEBIT_CARD" | "CREDIT_CARD";
  tenderedCents?: number | null;
}): {
  orderId: string;
  paymentMethod: "CASH" | "PIX" | "DEBIT_CARD" | "CREDIT_CARD";
  changeForCents?: number;
} {
  if (input.paymentMethod !== "CASH") {
    return {
      orderId: input.orderId,
      paymentMethod: input.paymentMethod,
    };
  }

  if (input.tenderedCents == null) {
    return {
      orderId: input.orderId,
      paymentMethod: "CASH",
    };
  }

  return {
    orderId: input.orderId,
    paymentMethod: "CASH",
    changeForCents: input.tenderedCents,
  };
}
