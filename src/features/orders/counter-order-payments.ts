import type { CreatablePaymentMethod } from "@/features/orders/payment-method";
import { creatablePaymentMethods } from "@/features/orders/payment-method";

/** Aligns with store money ceiling order of magnitude; R$ 100.000,00. */
export const ORDER_PAYMENT_MAX_CENTS = 10_000_000;

export const COUNTER_ORDER_MAX_PAYMENT_LINES = creatablePaymentMethods.length;

export type CounterPaymentLineInput = {
  method: CreatablePaymentMethod;
  amountCents: number;
  tenderedCents?: number;
};

export type NormalizedCounterPaymentLine = {
  method: CreatablePaymentMethod;
  amountCents: number;
  tenderedCents: number | null;
  changeCents: number | null;
};

export type NormalizeCounterPaymentsResult =
  | { ok: true; payments: NormalizedCounterPaymentLine[] }
  | { ok: false; message: string };

function isPositiveIntInRange(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= ORDER_PAYMENT_MAX_CENTS
  );
}

function isNonNegativeIntInRange(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value <= ORDER_PAYMENT_MAX_CENTS
  );
}

/**
 * Validates and normalizes COUNTER tender lines.
 * Server computes changeCents; never trusts client change.
 */
export function normalizeAndValidateCounterPayments(
  totalCents: number,
  payments: CounterPaymentLineInput[],
): NormalizeCounterPaymentsResult {
  if (!Number.isInteger(totalCents) || totalCents < 1) {
    return { ok: false, message: "Total do pedido inválido." };
  }

  if (!Array.isArray(payments) || payments.length === 0) {
    return {
      ok: false,
      message: "Informe ao menos uma forma de pagamento.",
    };
  }

  if (payments.length > COUNTER_ORDER_MAX_PAYMENT_LINES) {
    return {
      ok: false,
      message: `Informe no máximo ${COUNTER_ORDER_MAX_PAYMENT_LINES} formas de pagamento.`,
    };
  }

  const seen = new Set<CreatablePaymentMethod>();
  const normalized: NormalizedCounterPaymentLine[] = [];
  let sumAmount = 0;

  for (const line of payments) {
    if (!creatablePaymentMethods.includes(line.method)) {
      return { ok: false, message: "Forma de pagamento inválida." };
    }

    if (seen.has(line.method)) {
      return {
        ok: false,
        message: "Cada forma de pagamento só pode aparecer uma vez.",
      };
    }
    seen.add(line.method);

    if (!isPositiveIntInRange(line.amountCents)) {
      return {
        ok: false,
        message: "Valor aplicado inválido.",
      };
    }

    if (line.amountCents > totalCents) {
      return {
        ok: false,
        message: "Nenhuma parcela pode superar o total do pedido.",
      };
    }

    sumAmount += line.amountCents;

    if (line.method === "CASH") {
      if (line.tenderedCents === undefined) {
        normalized.push({
          method: "CASH",
          amountCents: line.amountCents,
          tenderedCents: null,
          changeCents: 0,
        });
        continue;
      }

      if (!isNonNegativeIntInRange(line.tenderedCents)) {
        return { ok: false, message: "Valor entregue inválido." };
      }

      if (line.tenderedCents < line.amountCents) {
        return {
          ok: false,
          message: "Informe um valor igual ou maior que o aplicado em dinheiro.",
        };
      }

      normalized.push({
        method: "CASH",
        amountCents: line.amountCents,
        tenderedCents: line.tenderedCents,
        changeCents: line.tenderedCents - line.amountCents,
      });
      continue;
    }

    if (line.tenderedCents !== undefined) {
      return {
        ok: false,
        message: "Valor entregue só se aplica a pagamento em dinheiro.",
      };
    }

    normalized.push({
      method: line.method,
      amountCents: line.amountCents,
      tenderedCents: null,
      changeCents: null,
    });
  }

  if (sumAmount !== totalCents) {
    return {
      ok: false,
      message: "A soma das formas de pagamento deve ser igual ao total.",
    };
  }

  return { ok: true, payments: normalized };
}

/** True when persisted lines match the normalized finalize payload (order-independent). */
export function counterPaymentsMatchPersisted(
  expected: NormalizedCounterPaymentLine[],
  persisted: Array<{
    method: string;
    amountCents: number;
    tenderedCents: number | null;
    changeCents: number | null;
  }>,
): boolean {
  if (expected.length !== persisted.length) {
    return false;
  }

  const byMethod = new Map(
    persisted.map((row) => [row.method, row] as const),
  );

  for (const line of expected) {
    const row = byMethod.get(line.method);
    if (!row) {
      return false;
    }
    if (row.amountCents !== line.amountCents) {
      return false;
    }
    if (row.tenderedCents !== line.tenderedCents) {
      return false;
    }
    if (row.changeCents !== line.changeCents) {
      return false;
    }
  }

  return true;
}
