"use server";

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
    console.error("[createOrderAction] unexpected error");
    return {
      ok: false,
      message: "Não foi possível criar o pedido. Tente novamente.",
    };
  }
}
