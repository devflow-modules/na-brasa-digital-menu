"use server";

import { revalidatePath } from "next/cache";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canManageMenuCategories,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { updateAdminCategory } from "@/features/admin/menu/admin-menu.repository";
import { updateCategorySchema } from "@/features/admin/menu/admin-menu.schema";
import type { AdminMenuActionResult } from "@/features/admin/menu/admin-menu.types";

function revalidateMenuPaths(storeSlug: string) {
  revalidatePath("/admin/cardapio");
  revalidatePath(`/${storeSlug}`);
}

export async function updateCategoryAction(
  input: unknown,
): Promise<AdminMenuActionResult> {
  const context = await requireAdminStoreContext();
  if (!canManageMenuCategories(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const updated = await updateAdminCategory(context.storeId, {
    categoryId: parsed.data.categoryId,
    name: parsed.data.name,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
  });

  if (!updated) {
    return { ok: false, message: "Categoria não encontrada." };
  }

  revalidateMenuPaths(context.storeSlug);
  return { ok: true };
}
