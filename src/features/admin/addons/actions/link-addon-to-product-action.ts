"use server";

import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canLinkMenuAddonToProduct,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { linkAdminAddonToProduct } from "@/features/admin/addons/admin-addons.repository";
import { revalidateAddonMenuPaths } from "@/features/admin/addons/admin-addons-revalidate";
import { linkAddonProductSchema } from "@/features/admin/addons/admin-addons.schema";
import type { AdminAddonActionResult } from "@/features/admin/addons/admin-addons.types";

export async function linkAddonToProductAction(
  input: unknown,
): Promise<AdminAddonActionResult> {
  const context = await requireAdminStoreContext();
  if (!canLinkMenuAddonToProduct(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = linkAddonProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const result = await linkAdminAddonToProduct(
    context.storeId,
    parsed.data.addonId,
    parsed.data.productId,
  );

  if (result === "not_found") {
    return { ok: false, message: "Produto ou adicional não encontrado." };
  }

  revalidateAddonMenuPaths(context.storeSlug);
  return { ok: true };
}
