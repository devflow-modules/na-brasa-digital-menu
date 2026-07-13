import { z } from "zod";

export const adminOrderStatusValues = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
] as const;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().trim().min(1, "Pedido inválido"),
  nextStatus: z.enum(adminOrderStatusValues),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
