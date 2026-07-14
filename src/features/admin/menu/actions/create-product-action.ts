"use server";

import { revalidatePath } from "next/cache";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canCreateMenuProduct,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { createAdminProduct } from "@/features/admin/menu/admin-menu.repository";
import { createProductSchema } from "@/features/admin/menu/admin-menu.schema";
import type { AdminMenuActionResult } from "@/features/admin/menu/admin-menu.types";

function revalidateMenuPaths(storeSlug: string) {
  revalidatePath("/admin/cardapio");
  revalidatePath(`/${storeSlug}`);
}

export async function createProductAction(
  input: unknown,
): Promise<AdminMenuActionResult> {
  const context = await requireAdminStoreContext();
  if (!canCreateMenuProduct(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const product = await createAdminProduct(context.storeId, {
    categoryId: parsed.data.categoryId,
    name: parsed.data.name,
    description: parsed.data.description,
    priceCents: parsed.data.priceCents,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
  });

  if (!product) {
    return { ok: false, message: "Categoria inválida para esta loja." };
  }

  revalidateMenuPaths(context.storeSlug);
  return { ok: true };
}
