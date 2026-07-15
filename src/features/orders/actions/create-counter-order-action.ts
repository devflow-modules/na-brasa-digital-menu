"use server";

import { revalidatePath } from "next/cache";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canCreateOrder,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { createCounterOrder } from "@/features/orders/services/create-counter-order.service";
import type { CreateCounterOrderResult } from "@/features/orders/types";

/**
 * Authenticated boundary for COUNTER orders.
 * Tenant and operator come from session context — never from client payload.
 */
export async function createCounterOrderAction(
  input: unknown,
): Promise<CreateCounterOrderResult> {
  const context = await requireAdminStoreContext();

  if (!canCreateOrder(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  try {
    const result = await createCounterOrder(
      {
        storeId: context.storeId,
        createdByUserId: context.session.userId,
      },
      input,
    );

    if (result.ok) {
      revalidatePath("/admin");
    }

    return result;
  } catch {
    console.error("[createCounterOrderAction] unexpected error");
    return {
      ok: false,
      message: "Não foi possível criar o pedido. Tente novamente.",
    };
  }
}
