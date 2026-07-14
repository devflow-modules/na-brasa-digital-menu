"use server";

import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canUnlinkMenuAddonFromProduct,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { unlinkAdminAddonFromProduct } from "@/features/admin/addons/admin-addons.repository";
import { revalidateAddonMenuPaths } from "@/features/admin/addons/admin-addons-revalidate";
import { unlinkAddonProductSchema } from "@/features/admin/addons/admin-addons.schema";
import type { AdminAddonActionResult } from "@/features/admin/addons/admin-addons.types";

export async function unlinkAddonFromProductAction(
  input: unknown,
): Promise<AdminAddonActionResult> {
  const context = await requireAdminStoreContext();
  if (!canUnlinkMenuAddonFromProduct(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = unlinkAddonProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const removed = await unlinkAdminAddonFromProduct(
    context.storeId,
    parsed.data.addonId,
    parsed.data.productId,
  );

  if (!removed) {
    return { ok: false, message: "Vínculo não encontrado." };
  }

  revalidateAddonMenuPaths(context.storeSlug);
  return { ok: true };
}
