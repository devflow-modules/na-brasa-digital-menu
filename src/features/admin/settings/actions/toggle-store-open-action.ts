"use server";

import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canToggleStoreOpen,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { setAdminStoreOpen } from "@/features/admin/settings/admin-store-settings.repository";
import { revalidateStoreSettingsPaths } from "@/features/admin/settings/admin-store-settings-revalidate";
import { toggleStoreOpenSchema } from "@/features/admin/settings/admin-store-settings.schema";
import type { AdminStoreSettingsActionResult } from "@/features/admin/settings/admin-store-settings.types";

export async function toggleStoreOpenAction(
  input: unknown,
): Promise<AdminStoreSettingsActionResult> {
  const context = await requireAdminStoreContext();
  if (!canToggleStoreOpen(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = toggleStoreOpenSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const updated = await setAdminStoreOpen(context.storeId, parsed.data.isOpen);
  if (!updated) {
    return { ok: false, message: "Loja não encontrada." };
  }

  revalidateStoreSettingsPaths(context.storeSlug);
  return { ok: true };
}
