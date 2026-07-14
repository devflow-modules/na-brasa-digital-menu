"use server";

import { revalidatePath } from "next/cache";
import { requireMasterSession } from "@/features/master/auth/master-session";
import { toggleStoreUserActiveSchema } from "@/features/master/users/master-store-users.schema";
import { setMasterStoreUserActive } from "@/features/master/users/master-store-users.repository";
import type { MasterStoreUserActionResult } from "@/features/master/users/master-store-users.types";

export async function toggleStoreUserActiveAction(
  input: unknown,
): Promise<MasterStoreUserActionResult> {
  await requireMasterSession();

  const parsed = toggleStoreUserActiveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Dados inválidos." };
  }

  const result = await setMasterStoreUserActive(parsed.data);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      return { ok: false, message: "Usuário não encontrado nesta loja." };
    }
    if (result.code === "FORBIDDEN") {
      return { ok: false, message: "Operação não permitida." };
    }
    return { ok: false, message: "Não foi possível atualizar o status." };
  }

  revalidatePath(`/master/stores/${parsed.data.storeId}/users`);
  return { ok: true };
}
