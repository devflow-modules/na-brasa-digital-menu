import { z } from "zod";

const idSchema = z.string().trim().min(1, "Identificador inválido.");

export function parsePriceInputToCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return Math.round(amount * 100);
}

const priceInputSchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const cents = parsePriceInputToCents(value);
    if (cents === null) {
      ctx.addIssue({
        code: "custom",
        message: "Preço inválido.",
      });
      return z.NEVER;
    }
    return cents;
  });

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nome da categoria é obrigatório."),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.coerce.boolean().optional().default(true),
});

export const updateCategorySchema = z.object({
  categoryId: idSchema,
  name: z.string().trim().min(1, "Nome da categoria é obrigatório."),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.coerce.boolean(),
});

export const createProductSchema = z.object({
  categoryId: idSchema,
  name: z.string().trim().min(1, "Nome do produto é obrigatório."),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  priceCents: priceInputSchema,
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.coerce.boolean().optional().default(true),
});

export const updateProductSchema = z.object({
  productId: idSchema,
  categoryId: idSchema,
  name: z.string().trim().min(1, "Nome do produto é obrigatório."),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  priceCents: priceInputSchema,
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.coerce.boolean(),
});

export const toggleProductSchema = z.object({
  productId: idSchema,
  active: z.coerce.boolean(),
});
