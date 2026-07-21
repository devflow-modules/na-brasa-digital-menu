import type { UserRole } from "@prisma/client";
import { finalizeCounterOrder } from "@/features/orders/services/finalize-counter-order.service";

/**
 * Calls finalizeCounterOrder directly (same path as the server action after auth).
 * Used for duplicate-finalization and concurrency assertions without UI.
 */
export async function attemptFinalizeCounterOrder(options: {
  orderId: string;
  storeId: string;
  role: UserRole;
  paymentMethod: "CASH" | "PIX" | "DEBIT_CARD" | "CREDIT_CARD";
  changeForCents?: number;
}) {
  return finalizeCounterOrder(
    {
      storeId: options.storeId,
      role: options.role,
    },
    {
      orderId: options.orderId,
      paymentMethod: options.paymentMethod,
      ...(options.changeForCents !== undefined
        ? { changeForCents: options.changeForCents }
        : {}),
    },
  );
}
