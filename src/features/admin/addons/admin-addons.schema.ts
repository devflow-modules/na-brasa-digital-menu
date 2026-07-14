import { z } from "zod";
import { parsePriceInputToCents } from "@/features/admin/menu/admin-menu.schema";

const idSchema = z.string().trim().min(1, "Identificador inválido.");

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

export const createAddonSchema = z.object({
  name: z.string().trim().min(1, "Nome do adicional é obrigatório."),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  priceCents: priceInputSchema,
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.coerce.boolean().optional().default(true),
});

export const updateAddonSchema = z.object({
  addonId: idSchema,
  name: z.string().trim().min(1, "Nome do adicional é obrigatório."),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  priceCents: priceInputSchema,
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.coerce.boolean(),
});

export const toggleAddonActiveSchema = z.object({
  addonId: idSchema,
  active: z.coerce.boolean(),
});

export const linkAddonProductSchema = z.object({
  addonId: idSchema,
  productId: idSchema,
});

export const unlinkAddonProductSchema = z.object({
  addonId: idSchema,
  productId: idSchema,
});
