import { createWhatsAppUrl } from "@/features/orders/whatsapp/create-whatsapp-url";
import type { CreateOrderResult } from "@/features/orders/types";
import {
  ORDER_IDEMPOTENCY_CONFLICT_MESSAGE,
} from "@/features/orders/utils/order-idempotency";

export type DirectOrderIdempotencyRecord = {
  id: string;
  code: string;
  idempotencyFingerprint: string | null;
  whatsappMessage: string | null;
};

export function resolveDirectOrderIdempotency(
  existing: DirectOrderIdempotencyRecord,
  fingerprint: string,
  storeWhatsapp: string,
): CreateOrderResult {
  if (existing.idempotencyFingerprint !== fingerprint) {
    return {
      ok: false,
      message: ORDER_IDEMPOTENCY_CONFLICT_MESSAGE,
      code: "IDEMPOTENCY_CONFLICT",
    };
  }

  if (!existing.whatsappMessage?.trim()) {
    return {
      ok: false,
      message: "Não foi possível criar o pedido. Tente novamente.",
    };
  }

  return {
    ok: true,
    orderId: existing.id,
    orderCode: existing.code,
    whatsappUrl: createWhatsAppUrl(storeWhatsapp, existing.whatsappMessage),
  };
}
