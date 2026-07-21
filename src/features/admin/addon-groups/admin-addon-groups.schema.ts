import { z } from "zod";

export const upsertAddonGroupSchema = z.object({
  productId: z.string().trim().min(1, "Produto inválido"),
  groupId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(2, "Informe o nome do grupo").max(80),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  minSelection: z.coerce.number().int().min(0),
  maxSelection: z.coerce.number().int().min(1),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean(),
  optionAddonIds: z.array(z.string().trim().min(1)).min(1, "Selecione ao menos uma opção"),
});

export const toggleAddonGroupActiveSchema = z.object({
  groupId: z.string().trim().min(1),
  active: z.boolean(),
});

export type UpsertAddonGroupInput = z.infer<typeof upsertAddonGroupSchema>;
