import { z } from "zod";

export const createOrderSchema = z
  .object({
    storeSlug: z.string().trim().min(1, "Loja inválida"),
    customerName: z
      .string()
      .trim()
      .min(2, "Informe pelo menos 2 caracteres"),
    customerPhone: z
      .string()
      .trim()
      .min(10, "Informe um telefone válido com DDD"),
    deliveryType: z.enum(["PICKUP", "DELIVERY"]),
    deliveryAddress: z.string().trim().optional().or(z.literal("")),
    paymentMethod: z.enum(["PIX", "CASH", "DEBIT_CARD", "CREDIT_CARD"]),
    changeFor: z.string().trim().optional().or(z.literal("")),
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
          addonIds: z.array(z.string().trim().min(1)),
        }),
      )
      .min(1, "Carrinho vazio"),
  })
  .refine(
    (data) =>
      data.deliveryType !== "DELIVERY" ||
      Boolean(data.deliveryAddress && data.deliveryAddress.length >= 5),
    {
      message: "Informe o endereço completo para entrega",
      path: ["deliveryAddress"],
    },
  );

export type CreateOrderSchemaInput = z.infer<typeof createOrderSchema>;
