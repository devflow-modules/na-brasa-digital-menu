"use server";

import { revalidatePath } from "next/cache";
import { requireMasterSession } from "@/features/master/auth/master-session";
import { createStoreUserSchema } from "@/features/master/users/master-store-users.schema";
import { createMasterStoreUser } from "@/features/master/users/master-store-users.repository";
import type { MasterStoreUserActionResult } from "@/features/master/users/master-store-users.types";

export async function createStoreUserAction(
  input: unknown,
): Promise<MasterStoreUserActionResult> {
  await requireMasterSession();

  const parsed = createStoreUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  // storeId comes from trusted form bound to the MASTER-validated route, not free client choice for auth.
  const result = await createMasterStoreUser({
    storeId: parsed.data.storeId,
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    password: parsed.data.password,
  });

  if (!result.ok) {
    if (result.code === "STORE_NOT_FOUND") {
      return { ok: false, message: "Loja não encontrada." };
    }
    if (result.code === "EMAIL_TAKEN") {
      return { ok: false, message: "Já existe um usuário com este e-mail." };
    }
    return { ok: false, message: "Não foi possível criar o usuário." };
  }

  revalidatePath(`/master/stores/${parsed.data.storeId}/users`);
  revalidatePath("/master");
  return { ok: true };
}
