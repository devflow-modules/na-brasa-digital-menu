import type { UserRole } from "@prisma/client";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canToggleStoreOpen,
  canUpdateStoreSettings,
} from "@/features/admin/auth/admin-permissions";
import {
  setAdminStoreOpen,
  updateAdminStoreSettings,
} from "@/features/admin/settings/admin-store-settings.repository";
import {
  toggleStoreOpenSchema,
  updateStoreSettingsSchema,
} from "@/features/admin/settings/admin-store-settings.schema";
import type { AdminStoreSettingsActionResult } from "@/features/admin/settings/admin-store-settings.types";

export async function updateAdminStoreSettingsForTests(
  rawInput: unknown,
  storeId: string,
  role: UserRole,
): Promise<AdminStoreSettingsActionResult> {
  if (!canUpdateStoreSettings(role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = updateStoreSettingsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const updated = await updateAdminStoreSettings(storeId, parsed.data);
  if (!updated) {
    return { ok: false, message: "Loja não encontrada." };
  }

  return { ok: true };
}

export async function toggleAdminStoreOpenForTests(
  rawInput: unknown,
  storeId: string,
  role: UserRole,
): Promise<AdminStoreSettingsActionResult> {
  if (!canToggleStoreOpen(role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = toggleStoreOpenSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const updated = await setAdminStoreOpen(storeId, parsed.data.isOpen);
  if (!updated) {
    return { ok: false, message: "Loja não encontrada." };
  }

  return { ok: true };
}
