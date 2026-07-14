"use server";

import { revalidatePath } from "next/cache";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canToggleProductActive,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { setAdminProductActive } from "@/features/admin/menu/admin-menu.repository";
import { toggleProductActiveSchema } from "@/features/admin/menu/admin-menu.schema";
import type { AdminMenuActionResult } from "@/features/admin/menu/admin-menu.types";

function revalidateMenuPaths(storeSlug: string) {
  revalidatePath("/admin/cardapio");
  revalidatePath(`/${storeSlug}`);
}

export async function toggleProductActiveAction(
  input: unknown,
): Promise<AdminMenuActionResult> {
  const context = await requireAdminStoreContext();
  if (!canToggleProductActive(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = toggleProductActiveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const updated = await setAdminProductActive(
    context.storeId,
    parsed.data.productId,
    parsed.data.active,
  );

  if (!updated) {
    return { ok: false, message: "Produto não encontrado." };
  }

  revalidateMenuPaths(context.storeSlug);
  return { ok: true };
}
