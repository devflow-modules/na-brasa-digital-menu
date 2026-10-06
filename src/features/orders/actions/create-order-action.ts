"use server";

import {
  ABUSE_RATE_LIMIT_MESSAGE,
  createOrderRateLimiter,
} from "@/features/ops/abuse-rate-limit";
import { logOpsCriticalError } from "@/features/ops/monitoring-webhook";
import { resolveRequestRateLimitKey } from "@/features/ops/request-rate-limit-key";
import { createOrder } from "@/features/orders/services/create-order.service";
import type {
  CreateOrderInput,
  CreateOrderResult,
} from "@/features/orders/types";

export async function createOrderAction(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const rateKey = await resolveRequestRateLimitKey("create-order");
  if (!createOrderRateLimiter.check(rateKey).allowed) {
    return { ok: false, message: ABUSE_RATE_LIMIT_MESSAGE };
  }

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
