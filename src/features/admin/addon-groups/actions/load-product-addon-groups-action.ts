"use server";

import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { getProductAddonGroupsAdminData } from "@/features/admin/addon-groups/admin-addon-groups.service";
import { productBelongsToStore } from "@/features/admin/menu/admin-menu.repository";

export async function loadProductAddonGroupsAction(productId: string) {
  const context = await requireAdminStoreContext();
  const product = await productBelongsToStore(productId, context.storeId);
  if (!product) {
    return { ok: false as const, message: "Produto não encontrado." };
  }

  const data = await getProductAddonGroupsAdminData(context.storeId, productId);
  return { ok: true as const, ...data };
}
