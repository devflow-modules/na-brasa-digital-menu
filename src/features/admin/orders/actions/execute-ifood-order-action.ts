"use server";

import { revalidatePath } from "next/cache";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import {
  executeAdminIfoodOrderAction,
  type ExecuteAdminIfoodOrderActionResult,
} from "@/features/admin/orders/admin-ifood-order-action.service";

export async function executeIfoodOrderAction(
  input: unknown,
): Promise<ExecuteAdminIfoodOrderActionResult> {
  const context = await requireAdminStoreContext();
  const result = await executeAdminIfoodOrderAction(
    input,
    context.storeId,
    context.role,
  );

  const orderId =
    typeof input === "object" &&
    input !== null &&
    "orderId" in input &&
    typeof (input as { orderId?: unknown }).orderId === "string"
      ? (input as { orderId: string }).orderId
      : null;

  revalidatePath("/admin");
  if (orderId) {
    revalidatePath(`/admin/pedidos/${orderId}`);
  }

  return result;
}
