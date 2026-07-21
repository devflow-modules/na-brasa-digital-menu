import { z } from "zod";
import { parsePriceInputToCents } from "@/features/admin/menu/admin-menu.schema";
import { normalizeWhatsappDigits } from "@/features/admin/settings/admin-store-whatsapp";

/** Soft ceiling for store fee / delivery minimum (R$ 10.000,00). */
export const STORE_MONEY_MAX_CENTS = 1_000_000;

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
    if (cents > STORE_MONEY_MAX_CENTS) {
      ctx.addIssue({
        code: "custom",
        message: "Valor máximo é R$ 10.000,00.",
      });
      return z.NEVER;
    }
    return cents;
  });

export const MODALITY_REQUIRED_MESSAGE =
  "Pelo menos uma modalidade deve permanecer habilitada.";

export const updateStoreSettingsSchema = z
  .object({
    whatsapp: z
      .string()
      .trim()
      .min(1, "WhatsApp é obrigatório.")
      .transform((value) => normalizeWhatsappDigits(value))
      .refine((digits) => digits.length >= 10 && digits.length <= 13, {
        message: "Informe um WhatsApp válido com DDD.",
      }),
    address: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === "" ? null : (v ?? null))),
    openingHours: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === "" ? null : (v ?? null))),
    deliveryFeeCents: priceInputSchema,
    minimumOrderAmountCents: priceInputSchema,
    pickupEnabled: z.coerce.boolean(),
    deliveryEnabled: z.coerce.boolean(),
  })
  .refine((data) => data.pickupEnabled || data.deliveryEnabled, {
    message: MODALITY_REQUIRED_MESSAGE,
    path: ["deliveryEnabled"],
  });

export const toggleStoreOpenSchema = z.object({
  isOpen: z.coerce.boolean(),
});
