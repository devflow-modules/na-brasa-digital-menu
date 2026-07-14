"use server";

import { revalidatePath } from "next/cache";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import {
  updateAdminOrderStatus,
  type UpdateOrderStatusResult,
} from "@/features/admin/orders/admin-order-status.service";

export async function updateOrderStatusAction(
  input: unknown,
): Promise<UpdateOrderStatusResult> {
  const context = await requireAdminStoreContext();
  const result = await updateAdminOrderStatus(input, context.storeId);

  if (!result.ok) {
    return result;
  }

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
