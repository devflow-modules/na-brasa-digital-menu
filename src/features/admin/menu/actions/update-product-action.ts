"use server";

import { revalidatePath } from "next/cache";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { updateAdminMenuProduct } from "@/features/admin/menu/admin-menu.service";
import type { AdminMenuActionResult } from "@/features/admin/menu/admin-menu.types";

function revalidateMenuPaths(storeSlug: string) {
  revalidatePath("/admin/cardapio");
  revalidatePath(`/${storeSlug}`);
}

export async function updateProductAction(
  input: unknown,
): Promise<AdminMenuActionResult> {
  const context = await requireAdminStoreContext();
  const result = await updateAdminMenuProduct(
    input,
    context.storeId,
    context.role,
  );

  if (!result.ok) {
    return result;
  }

  revalidateMenuPaths(context.storeSlug);
  return { ok: true };
}
