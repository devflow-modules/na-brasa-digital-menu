"use server";

import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canCreateMenuAddon,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { createAdminAddon } from "@/features/admin/addons/admin-addons.repository";
import { revalidateAddonMenuPaths } from "@/features/admin/addons/admin-addons-revalidate";
import { createAddonSchema } from "@/features/admin/addons/admin-addons.schema";
import type { AdminAddonActionResult } from "@/features/admin/addons/admin-addons.types";

export async function createAddonAction(
  input: unknown,
): Promise<AdminAddonActionResult> {
  const context = await requireAdminStoreContext();
  if (!canCreateMenuAddon(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = createAddonSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  await createAdminAddon(context.storeId, {
    name: parsed.data.name,
    description: parsed.data.description,
    priceCents: parsed.data.priceCents,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
  });

  revalidateAddonMenuPaths(context.storeSlug);
  return { ok: true };
}
