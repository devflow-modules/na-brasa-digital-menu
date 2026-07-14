"use server";

import { revalidatePath } from "next/cache";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canToggleProductAvailability,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { setAdminProductActive } from "@/features/admin/menu/admin-menu.repository";
import { toggleProductSchema } from "@/features/admin/menu/admin-menu.schema";
import type { AdminMenuActionResult } from "@/features/admin/menu/admin-menu.types";

function revalidateMenuPaths(storeSlug: string) {
  revalidatePath("/admin/cardapio");
  revalidatePath(`/${storeSlug}`);
}

/**
 * Toggles public availability. Maps to Product.active (no separate column in schema).
 */
export async function toggleProductAvailabilityAction(
  input: unknown,
): Promise<AdminMenuActionResult> {
  const context = await requireAdminStoreContext();
  if (!canToggleProductAvailability(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = toggleProductSchema.safeParse(input);
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
