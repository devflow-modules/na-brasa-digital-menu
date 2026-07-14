import { z } from "zod";
import { STORE_USER_ROLES } from "@/features/master/users/master-store-users.types";

const storeUserRoleSchema = z.enum(STORE_USER_ROLES);

export const createStoreUserSchema = z
  .object({
    storeId: z.string().trim().min(1, "Loja inválida"),
    name: z.string().trim().min(2, "Informe o nome"),
    email: z.string().trim().email("Informe um e-mail válido"),
    role: storeUserRoleSchema,
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres (recomendado 12+)"),
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type CreateStoreUserInput = z.infer<typeof createStoreUserSchema>;

export const toggleStoreUserActiveSchema = z.object({
  storeId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  isActive: z.boolean(),
});

export type ToggleStoreUserActiveInput = z.infer<
  typeof toggleStoreUserActiveSchema
>;

export const updateStoreUserRoleSchema = z.object({
  storeId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  role: storeUserRoleSchema,
});

export type UpdateStoreUserRoleInput = z.infer<typeof updateStoreUserRoleSchema>;
