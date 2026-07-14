import { z } from "zod";
import { parsePriceInputToCents } from "@/features/admin/menu/admin-menu.schema";

const priceInputSchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const cents = parsePriceInputToCents(value);
    if (cents === null) {
      ctx.addIssue({
        code: "custom",
        message: "Valor inválido.",
      });
      return z.NEVER;
    }
    return cents;
  });

function normalizeWhatsapp(value: string): string {
  return value.replace(/\D/g, "");
}

export const updateStoreSettingsSchema = z.object({
  whatsapp: z
    .string()
    .trim()
    .min(1, "WhatsApp é obrigatório.")
    .transform((value) => normalizeWhatsapp(value))
    .refine((digits) => digits.length >= 10 && digits.length <= 13, {
      message: "Informe um WhatsApp válido com DDD.",
    }),
  address: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  openingHours: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : v ?? null)),
  deliveryFeeCents: priceInputSchema,
  pickupEnabled: z.coerce.boolean(),
  deliveryEnabled: z.coerce.boolean(),
  isOpen: z.coerce.boolean(),
});

export const toggleStoreOpenSchema = z.object({
  isOpen: z.coerce.boolean(),
});
