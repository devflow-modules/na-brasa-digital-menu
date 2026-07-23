import { z } from "zod";

/** Browser may send only the internal operational Order id. */
export const executeIfoodOrderActionSchema = z.object({
  orderId: z.string().min(1),
});

export type ExecuteIfoodOrderActionSchemaInput = z.infer<
  typeof executeIfoodOrderActionSchema
>;
