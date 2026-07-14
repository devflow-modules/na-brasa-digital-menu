import { canLinkMenuAddonToProduct } from "@/features/admin/auth/admin-permissions";
import { linkAdminAddonToProduct } from "@/features/admin/addons/admin-addons.repository";
import type { UserRole } from "@prisma/client";

export async function attemptLinkAddonToProduct(options: {
  storeId: string;
  role: UserRole;
  addonId: string;
  productId: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (!canLinkMenuAddonToProduct(options.role)) {
    return {
      ok: false,
      message: "Você não tem permissão para executar esta ação.",
    };
  }

  const result = await linkAdminAddonToProduct(
    options.storeId,
    options.addonId,
    options.productId,
  );
  if (result === "not_found") {
    return { ok: false, message: "Produto ou adicional não encontrado." };
  }
  return { ok: true };
}