import { z } from "zod";

const isoDateTimeSchema = z
  .string()
  .trim()
  .min(1, "Cursor inválido.")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Cursor inválido.",
  });

const orderIdSchema = z.string().trim().min(1, "Cursor inválido.");

/**
 * Bootstrap: omit both cursor fields (or pass empty object).
 * Delta: both afterCreatedAt and afterId required together.
 */
export const pollNewAdminOrdersSchema = z
  .object({
    afterCreatedAt: isoDateTimeSchema.optional(),
    afterId: orderIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const hasCreatedAt = data.afterCreatedAt !== undefined;
    const hasId = data.afterId !== undefined;

    if (hasCreatedAt !== hasId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cursor inválido.",
        path: hasCreatedAt ? ["afterId"] : ["afterCreatedAt"],
      });
    }
  });

export type PollNewAdminOrdersSchemaInput = z.infer<
  typeof pollNewAdminOrdersSchema
>;
