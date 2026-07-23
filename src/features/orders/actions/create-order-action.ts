"use server";

import { logOpsCriticalError } from "@/features/ops/monitoring-webhook";
import { createOrder } from "@/features/orders/services/create-order.service";
import type {
  CreateOrderInput,
  CreateOrderResult,
} from "@/features/orders/types";

export async function createOrderAction(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  try {
    return await createOrder(input);
  } catch {
    await logOpsCriticalError({
      scope: "checkout.create-order",
      message: "Unexpected failure creating online order",
      code: "unexpected",
    });
    return {
      ok: false,
      message: "Não foi possível criar o pedido. Tente novamente.",
    };
  }
}
