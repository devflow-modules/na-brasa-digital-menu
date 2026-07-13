import { z } from "zod";

export const checkoutFormSchema = z
  .object({
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
    needsChange: z.boolean(),
    changeFor: z.string().trim().optional().or(z.literal("")),
    notes: z
      .string()
      .trim()
      .max(300, "Máximo de 300 caracteres")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) =>
      data.deliveryType !== "DELIVERY" ||
      Boolean(data.deliveryAddress && data.deliveryAddress.length >= 5),
    {
      message: "Informe o endereço completo para entrega",
      path: ["deliveryAddress"],
    },
  )
  .refine(
    (data) =>
      data.paymentMethod !== "CASH" ||
      !data.needsChange ||
      Boolean(data.changeFor && data.changeFor.length > 0),
    {
      message: "Informe o valor para troco",
      path: ["changeFor"],
    },
  );

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export const checkoutFormDefaultValues: CheckoutFormValues = {
  customerName: "",
  customerPhone: "",
  deliveryType: "PICKUP",
  deliveryAddress: "",
  paymentMethod: "PIX",
  needsChange: false,
  changeFor: "",
  notes: "",
};
