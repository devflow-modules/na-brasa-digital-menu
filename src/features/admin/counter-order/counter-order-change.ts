/**
 * Pure helpers for COUNTER cash tender / change display and multi-payment UI.
 * `changeForCents` on Order (legacy) = amount the customer handed over (CASH).
 * On OrderPayment: amountCents = applied; tenderedCents = handed; changeCents = server.
 */

import type { CreatablePaymentMethod } from "@/features/orders/payment-method";
import { creatablePaymentMethods } from "@/features/orders/payment-method";

export type CounterPaymentDraftLine = {
  method: CreatablePaymentMethod;
  /** Applied to order total (centavos). */
  amountCents: number | null;
  /** Cash handed over; null/empty = exact for that amount. */
  tenderedCents: number | null;
  tenderedInput: string;
  amountInput: string;
};

export function isCashTenderValid(
  amountCents: number,
  tenderedCents: number | null | undefined,
): boolean {
  if (tenderedCents == null) {
    return true;
  }

  return (
    Number.isInteger(tenderedCents) &&
    tenderedCents >= 0 &&
    tenderedCents >= amountCents
  );
}

export function computeCashChangeCents(
  amountCents: number,
  tenderedCents: number | null | undefined,
): number | null {
  if (!isCashTenderValid(amountCents, tenderedCents)) {
    return null;
  }

  if (tenderedCents == null) {
    return 0;
  }

  return tenderedCents - amountCents;
}

export function sumDraftAppliedCents(lines: CounterPaymentDraftLine[]): number {
  let sum = 0;
  for (const line of lines) {
    if (line.amountCents != null && Number.isInteger(line.amountCents)) {
      sum += line.amountCents;
    }
  }
  return sum;
}

export function remainingDraftCents(
  totalCents: number,
  lines: CounterPaymentDraftLine[],
): number {
  return totalCents - sumDraftAppliedCents(lines);
}

export function unusedPaymentMethods(
  lines: CounterPaymentDraftLine[],
): CreatablePaymentMethod[] {
  const used = new Set(lines.map((line) => line.method));
  return creatablePaymentMethods.filter((method) => !used.has(method));
}

export function isDraftLineValid(line: CounterPaymentDraftLine): boolean {
  if (line.amountCents == null || line.amountCents < 1) {
    return false;
  }
  if (line.method !== "CASH") {
    return line.tenderedInput.trim() === "";
  }
  if (line.tenderedInput.trim() === "") {
    return true;
  }
  if (line.tenderedCents == null) {
    return false;
  }
  return isCashTenderValid(line.amountCents, line.tenderedCents);
}

export function canConfirmCounterPaymentDraft(
  totalCents: number,
  lines: CounterPaymentDraftLine[],
): boolean {
  if (lines.length === 0) {
    return false;
  }
  if (remainingDraftCents(totalCents, lines) !== 0) {
    return false;
  }
  return lines.every(isDraftLineValid);
}

export function buildFinalizePaymentsPayload(input: {
  orderId: string;
  lines: CounterPaymentDraftLine[];
}): {
  orderId: string;
  payments: Array<{
    method: CreatablePaymentMethod;
    amountCents: number;
    tenderedCents?: number;
  }>;
} {
  return {
    orderId: input.orderId,
    payments: input.lines.map((line) => {
      const amountCents = line.amountCents ?? 0;
      if (line.method === "CASH" && line.tenderedCents != null) {
        return {
          method: "CASH",
          amountCents,
          tenderedCents: line.tenderedCents,
        };
      }
      return {
        method: line.method,
        amountCents,
      };
    }),
  };
}

/** @deprecated Prefer buildFinalizePaymentsPayload — kept for single-tender helpers/tests. */
export function buildFinalizeCounterOrderPayload(input: {
  orderId: string;
  paymentMethod: CreatablePaymentMethod;
  tenderedCents?: number | null;
}): {
  orderId: string;
  paymentMethod: CreatablePaymentMethod;
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

export function createDraftLine(
  method: CreatablePaymentMethod,
  amountCents: number,
): CounterPaymentDraftLine {
  const amountInput =
    amountCents > 0
      ? (amountCents / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "";

  return {
    method,
    amountCents: amountCents > 0 ? amountCents : null,
    tenderedCents: null,
    tenderedInput: "",
    amountInput,
  };
}
