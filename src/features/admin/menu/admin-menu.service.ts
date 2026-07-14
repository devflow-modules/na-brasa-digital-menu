import type { UserRole } from "@prisma/client";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canUpdateMenuProduct,
} from "@/features/admin/auth/admin-permissions";
import { updateAdminProduct } from "@/features/admin/menu/admin-menu.repository";
import { updateProductSchema } from "@/features/admin/menu/admin-menu.schema";
import type { AdminMenuActionResult } from "@/features/admin/menu/admin-menu.types";

export async function updateAdminMenuProduct(
  rawInput: unknown,
  storeId: string,
  role: UserRole,
): Promise<AdminMenuActionResult> {
  if (!canUpdateMenuProduct(role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = updateProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const updated = await updateAdminProduct(storeId, {
    productId: parsed.data.productId,
    categoryId: parsed.data.categoryId,
    name: parsed.data.name,
    description: parsed.data.description,
    priceCents: parsed.data.priceCents,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
  });

  if (!updated) {
    return { ok: false, message: "Produto não encontrado." };
  }

  return { ok: true };
}
