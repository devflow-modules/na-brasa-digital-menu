"use server";

import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canToggleMenuAddonActive,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { setAdminAddonActive } from "@/features/admin/addons/admin-addons.repository";
import { revalidateAddonMenuPaths } from "@/features/admin/addons/admin-addons-revalidate";
import { toggleAddonActiveSchema } from "@/features/admin/addons/admin-addons.schema";
import type { AdminAddonActionResult } from "@/features/admin/addons/admin-addons.types";

export async function toggleAddonActiveAction(
  input: unknown,
): Promise<AdminAddonActionResult> {
  const context = await requireAdminStoreContext();
  if (!canToggleMenuAddonActive(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = toggleAddonActiveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const updated = await setAdminAddonActive(
    context.storeId,
    parsed.data.addonId,
    parsed.data.active,
  );

  if (!updated) {
    return { ok: false, message: "Adicional não encontrado." };
  }

  revalidateAddonMenuPaths(context.storeSlug);
  return { ok: true };
}
