import { z } from "zod";
import { creatablePaymentMethods } from "@/features/orders/payment-method";

export const counterPaymentMethodValues = creatablePaymentMethods;

export const finalizeCounterOrderSchema = z
  .object({
    orderId: z.string().trim().min(1, "Pedido inválido"),
    paymentMethod: z.enum(counterPaymentMethodValues, {
      message: "Forma de pagamento inválida.",
    }),
    changeForCents: z
      .number({ error: "Valor entregue inválido." })
      .int("Valor entregue deve ser inteiro em centavos.")
      .nonnegative("Valor entregue não pode ser negativo.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod !== "CASH" && data.changeForCents !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["changeForCents"],
        message:
          "Valor entregue só se aplica a pagamento em dinheiro.",
      });
    }
  });

export type FinalizeCounterOrderSchemaInput = z.infer<
  typeof finalizeCounterOrderSchema
>;
