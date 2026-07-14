"use server";

import { revalidatePath } from "next/cache";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canManageMenuCategories,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { createAdminCategory } from "@/features/admin/menu/admin-menu.repository";
import { createCategorySchema } from "@/features/admin/menu/admin-menu.schema";
import type { AdminMenuActionResult } from "@/features/admin/menu/admin-menu.types";

function revalidateMenuPaths(storeSlug: string) {
  revalidatePath("/admin/cardapio");
  revalidatePath(`/${storeSlug}`);
}

export async function createCategoryAction(
  input: unknown,
): Promise<AdminMenuActionResult> {
  const context = await requireAdminStoreContext();
  if (!canManageMenuCategories(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  await createAdminCategory(context.storeId, {
    name: parsed.data.name,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
  });

  revalidateMenuPaths(context.storeSlug);
  return { ok: true };
}
