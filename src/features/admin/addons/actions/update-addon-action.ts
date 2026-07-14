"use server";

import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canUpdateMenuAddon,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { updateAdminAddon } from "@/features/admin/addons/admin-addons.repository";
import { revalidateAddonMenuPaths } from "@/features/admin/addons/admin-addons-revalidate";
import { updateAddonSchema } from "@/features/admin/addons/admin-addons.schema";
import type { AdminAddonActionResult } from "@/features/admin/addons/admin-addons.types";

export async function updateAddonAction(
  input: unknown,
): Promise<AdminAddonActionResult> {
  const context = await requireAdminStoreContext();
  if (!canUpdateMenuAddon(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = updateAddonSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const updated = await updateAdminAddon(context.storeId, {
    addonId: parsed.data.addonId,
    name: parsed.data.name,
    description: parsed.data.description,
    priceCents: parsed.data.priceCents,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
  });

  if (!updated) {
    return { ok: false, message: "Adicional não encontrado." };
  }

  revalidateAddonMenuPaths(context.storeSlug);
  return { ok: true };
}
