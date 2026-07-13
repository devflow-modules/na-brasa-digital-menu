"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/features/admin/auth/admin-session";
import {
  updateAdminOrderStatus,
  type UpdateOrderStatusResult,
} from "@/features/admin/orders/admin-order-status.service";

export async function updateOrderStatusAction(
  input: unknown,
): Promise<UpdateOrderStatusResult> {
  const session = await getAdminSession();

  if (!session) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const result = await updateAdminOrderStatus(input);

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
