"use server";

import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canUpdateStoreSettings,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { updateAdminStoreSettings } from "@/features/admin/settings/admin-store-settings.repository";
import { revalidateStoreSettingsPaths } from "@/features/admin/settings/admin-store-settings-revalidate";
import { updateStoreSettingsSchema } from "@/features/admin/settings/admin-store-settings.schema";
import type { AdminStoreSettingsActionResult } from "@/features/admin/settings/admin-store-settings.types";

export async function updateStoreSettingsAction(
  input: unknown,
): Promise<AdminStoreSettingsActionResult> {
  const context = await requireAdminStoreContext();
  if (!canUpdateStoreSettings(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = updateStoreSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const updated = await updateAdminStoreSettings(context.storeId, parsed.data);
  if (!updated) {
    return { ok: false, message: "Loja não encontrada." };
  }

  revalidateStoreSettingsPaths(context.storeSlug);
  return { ok: true };
}
