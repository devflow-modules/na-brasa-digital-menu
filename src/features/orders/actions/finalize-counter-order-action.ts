"use server";

import { revalidatePath } from "next/cache";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  hasAdminPermission,
} from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import {
  finalizeCounterOrder,
  type FinalizeCounterOrderResult,
} from "@/features/orders/services/finalize-counter-order.service";

/**
 * Authenticated boundary for COUNTER payment + completion.
 * Tenant and role come from session — never from client payload.
 */
export async function finalizeCounterOrderAction(
  input: unknown,
): Promise<FinalizeCounterOrderResult> {
  const context = await requireAdminStoreContext();

  if (!hasAdminPermission(context.role, "orders.status.complete")) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  try {
    const result = await finalizeCounterOrder(
      {
        storeId: context.storeId,
        role: context.role,
      },
      input,
    );

    if (result.ok) {
      revalidatePath("/admin");
      revalidatePath(`/admin/pedidos/${result.orderId}`);
    }

    return result;
  } catch {
    console.error("[finalizeCounterOrderAction] unexpected error");
    return {
      ok: false,
      message: "Não foi possível finalizar o pedido. Tente novamente.",
    };
  }
}
