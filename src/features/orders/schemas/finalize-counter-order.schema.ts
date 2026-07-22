import { z } from "zod";
import {
  COUNTER_ORDER_MAX_PAYMENT_LINES,
  ORDER_PAYMENT_MAX_CENTS,
} from "@/features/orders/counter-order-payments";
import { creatablePaymentMethods } from "@/features/orders/payment-method";

function zodFirstMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos para finalizar o pedido.";
}

export const counterPaymentMethodValues = creatablePaymentMethods;

const paymentLineSchema = z
  .object({
    method: z.enum(counterPaymentMethodValues, {
      message: "Forma de pagamento inválida.",
    }),
    amountCents: z
      .number({ error: "Valor aplicado inválido." })
      .int("Valor aplicado deve ser inteiro em centavos.")
      .positive("Valor aplicado deve ser maior que zero.")
      .max(ORDER_PAYMENT_MAX_CENTS, "Valor aplicado excede o limite."),
    tenderedCents: z
      .number({ error: "Valor entregue inválido." })
      .int("Valor entregue deve ser inteiro em centavos.")
      .nonnegative("Valor entregue não pode ser negativo.")
      .max(ORDER_PAYMENT_MAX_CENTS, "Valor entregue excede o limite.")
      .optional(),
  })
  .strict();

const paymentsShapeSchema = z
  .object({
    orderId: z.string().trim().min(1, "Pedido inválido"),
    payments: z
      .array(paymentLineSchema)
      .min(1, "Informe ao menos uma forma de pagamento.")
      .max(
        COUNTER_ORDER_MAX_PAYMENT_LINES,
        `Informe no máximo ${COUNTER_ORDER_MAX_PAYMENT_LINES} formas de pagamento.`,
      ),
  })
  .strict();

const legacyShapeSchema = z
  .object({
    orderId: z.string().trim().min(1, "Pedido inválido"),
    paymentMethod: z.enum(counterPaymentMethodValues, {
      message: "Forma de pagamento inválida.",
    }),
    changeForCents: z
      .number({ error: "Valor entregue inválido." })
      .int("Valor entregue deve ser inteiro em centavos.")
      .nonnegative("Valor entregue não pode ser negativo.")
      .max(ORDER_PAYMENT_MAX_CENTS, "Valor entregue excede o limite.")
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.paymentMethod !== "CASH" && data.changeForCents !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["changeForCents"],
        message: "Valor entregue só se aplica a pagamento em dinheiro.",
      });
    }
  });

export type FinalizeCounterOrderPaymentsInput = z.infer<
  typeof paymentsShapeSchema
>;

export type FinalizeCounterOrderLegacyInput = z.infer<typeof legacyShapeSchema>;

export type FinalizeCounterOrderSchemaInput =
  | FinalizeCounterOrderPaymentsInput
  | FinalizeCounterOrderLegacyInput;

export function isLegacyFinalizeCounterOrderInput(
  input: FinalizeCounterOrderSchemaInput,
): input is FinalizeCounterOrderLegacyInput {
  return "paymentMethod" in input;
}

/**
 * Parses finalize payload. Accepts payments[] or legacy single-method shape.
 * Business rules (sum, duplicates, change) run after order total is known.
 */
export function parseFinalizeCounterOrderInput(
  rawInput: unknown,
): FinalizeCounterOrderSchemaInput {
  if (rawInput == null || typeof rawInput !== "object" || Array.isArray(rawInput)) {
    throw new Error("Dados inválidos para finalizar o pedido.");
  }

  const record = rawInput as Record<string, unknown>;
  const hasPayments = "payments" in record;
  const hasLegacy = "paymentMethod" in record;

  if (hasPayments && hasLegacy) {
    throw new Error(
      "Envie payments[] ou paymentMethod legado, não os dois.",
    );
  }

  try {
    if (hasPayments) {
      return paymentsShapeSchema.parse(record);
    }

    if (hasLegacy) {
      return legacyShapeSchema.parse(record);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(zodFirstMessage(error));
    }
    throw error;
  }

  throw new Error("Informe as formas de pagamento.");
}

/** @deprecated Prefer parseFinalizeCounterOrderInput — kept for import compatibility. */
export const finalizeCounterOrderSchema = {
  safeParse(rawInput: unknown) {
    try {
      return {
        success: true as const,
        data: parseFinalizeCounterOrderInput(rawInput),
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Dados inválidos para finalizar o pedido.";
      return {
        success: false as const,
        error: { issues: [{ message }] },
      };
    }
  },
};
