import type { UserRole } from "@prisma/client";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canUpdateMenuAddon,
} from "@/features/admin/auth/admin-permissions";
import { updateAdminAddon } from "@/features/admin/addons/admin-addons.repository";
import { updateAddonSchema } from "@/features/admin/addons/admin-addons.schema";
import type { AdminAddonActionResult } from "@/features/admin/addons/admin-addons.types";

export async function updateAdminAddonForTests(
  rawInput: unknown,
  storeId: string,
  role: UserRole,
): Promise<AdminAddonActionResult> {
  if (!canUpdateMenuAddon(role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = updateAddonSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const updated = await updateAdminAddon(storeId, {
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

  return { ok: true };
}
