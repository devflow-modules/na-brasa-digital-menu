import { z } from "zod";

export const createCounterOrderSchema = z.object({
  customerLabel: z
    .string()
    .trim()
    .max(80, "Máximo de 80 caracteres")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(300, "Máximo de 300 caracteres")
    .optional()
    .or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1, "Produto inválido"),
        quantity: z
          .number()
          .int("Quantidade inválida")
          .min(1, "Quantidade mínima é 1")
          .max(20, "Quantidade máxima é 20"),
        addonIds: z
          .array(z.string().trim().min(1))
          .optional()
          .default([]),
        notes: z
          .string()
          .trim()
          .max(200, "Máximo de 200 caracteres")
          .optional()
          .or(z.literal("")),
      }),
    )
    .min(1, "Carrinho vazio"),
});

export type CreateCounterOrderSchemaInput = z.infer<
  typeof createCounterOrderSchema
>;
