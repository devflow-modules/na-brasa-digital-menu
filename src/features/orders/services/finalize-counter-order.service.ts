import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  hasAdminPermission,
} from "@/features/admin/auth/admin-permissions";
import { isTransitionAllowed } from "@/features/admin/orders/admin-order-status-transitions";
import {
  findOrderForCounterFinalize,
  finalizeCounterOrderPayment,
} from "@/features/admin/orders/admin-orders.repository";
import { recordOrderLifecycleFunnelEvent } from "@/features/analytics/record-order-lifecycle-funnel-event";
import {
  counterPaymentsMatchPersisted,
  normalizeAndValidateCounterPayments,
  type NormalizedCounterPaymentLine,
} from "@/features/orders/counter-order-payments";
import {
  isLegacyFinalizeCounterOrderInput,
  parseFinalizeCounterOrderInput,
} from "@/features/orders/schemas/finalize-counter-order.schema";
import type { PaymentMethod, UserRole } from "@prisma/client";

export type FinalizeCounterOrderContext = {
  storeId: string;
  role: UserRole;
  userId: string | null;
};

export type FinalizeCounterOrderResult =
  | {
      ok: true;
      orderId: string;
      status: "COMPLETED";
      paymentMethod: PaymentMethod | null;
      paidAt: string;
      changeForCents: number | null;
      payments: NormalizedCounterPaymentLine[];
    }
  | { ok: false; message: string };

export type FinalizeCounterOrderDeps = {
  findOrderForCounterFinalize: typeof findOrderForCounterFinalize;
  finalizeCounterOrderPayment: typeof finalizeCounterOrderPayment;
  now: () => Date;
  recordOrderLifecycleFunnelEvent?: typeof recordOrderLifecycleFunnelEvent;
};

const defaultDeps: FinalizeCounterOrderDeps = {
  findOrderForCounterFinalize,
  finalizeCounterOrderPayment,
  now: () => new Date(),
  recordOrderLifecycleFunnelEvent,
};

function firstParseMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Dados inválidos para finalizar o pedido.";
}

function legacyMirror(payments: NormalizedCounterPaymentLine[]): {
  paymentMethod: PaymentMethod | null;
  changeForCents: number | null;
} {
  if (payments.length === 1) {
    const only = payments[0]!;
    return {
      paymentMethod: only.method,
      changeForCents: only.method === "CASH" ? only.tenderedCents : null,
    };
  }

  return { paymentMethod: null, changeForCents: null };
}

function successResult(
  orderId: string,
  paidAt: Date,
  payments: NormalizedCounterPaymentLine[],
): Extract<FinalizeCounterOrderResult, { ok: true }> {
  const mirror = legacyMirror(payments);
  return {
    ok: true,
    orderId,
    status: "COMPLETED",
    paymentMethod: mirror.paymentMethod,
    paidAt: paidAt.toISOString(),
    changeForCents: mirror.changeForCents,
    payments,
  };
}

/**
 * COUNTER payment confirmation + COMPLETED.
 * Concurrency-safe via READY+paidAt:null update; replay with the same
 * payments returns success; conflicting replay returns an error.
 * Explicit idempotency keys for InfiniteTap remain #110.
 */
export async function finalizeCounterOrder(
  context: FinalizeCounterOrderContext,
  rawInput: unknown,
  deps: FinalizeCounterOrderDeps = defaultDeps,
): Promise<FinalizeCounterOrderResult> {
  if (!hasAdminPermission(context.role, "orders.status.complete")) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  let parsedInput;
  try {
    parsedInput = parseFinalizeCounterOrderInput(rawInput);
  } catch (error) {
    return { ok: false, message: firstParseMessage(error) };
  }

  const order = await deps.findOrderForCounterFinalize(
    parsedInput.orderId,
    context.storeId,
  );

  if (!order) {
    return { ok: false, message: "Pedido não encontrado." };
  }

  if (order.source !== "COUNTER") {
    return {
      ok: false,
      message: "Somente pedidos de balcão usam este fluxo de recebimento.",
    };
  }

  if (order.status === "CANCELLED") {
    return { ok: false, message: "Pedido cancelado não pode ser finalizado." };
  }

  const paymentLines = isLegacyFinalizeCounterOrderInput(parsedInput)
    ? [
        {
          method: parsedInput.paymentMethod,
          amountCents: order.totalCents,
          ...(parsedInput.changeForCents !== undefined
            ? { tenderedCents: parsedInput.changeForCents }
            : {}),
        },
      ]
    : parsedInput.payments;

  const normalized = normalizeAndValidateCounterPayments(
    order.totalCents,
    paymentLines,
  );
  if (!normalized.ok) {
    return { ok: false, message: normalized.message };
  }

  if (order.status === "COMPLETED" || order.paidAt != null) {
    if (
      counterPaymentsMatchPersisted(normalized.payments, order.payments)
    ) {
      return successResult(
        order.id,
        order.paidAt ?? deps.now(),
        normalized.payments,
      );
    }

    return {
      ok: false,
      message: "Este pedido já foi finalizado com outro pagamento.",
    };
  }

  if (order.status !== "READY") {
    return {
      ok: false,
      message: "Este pedido ainda não está pronto para recebimento.",
    };
  }

  if (!isTransitionAllowed(order.status, "COMPLETED", order.deliveryType)) {
    return { ok: false, message: "Transição de status não permitida." };
  }

  const paidAt = deps.now();
  const mirror = legacyMirror(normalized.payments);

  try {
    const result = await deps.finalizeCounterOrderPayment({
      orderId: order.id,
      storeId: context.storeId,
      payments: normalized.payments,
      paymentMethod: mirror.paymentMethod,
      changeForCents: mirror.changeForCents,
      paidAt,
      createdByUserId: context.userId,
    });

    if (!result.updated) {
      const latest = await deps.findOrderForCounterFinalize(
        parsedInput.orderId,
        context.storeId,
      );

      if (!latest || latest.storeId !== context.storeId) {
        return { ok: false, message: "Pedido não encontrado." };
      }

      if (latest.status === "COMPLETED" || latest.paidAt != null) {
        if (
          counterPaymentsMatchPersisted(normalized.payments, latest.payments)
        ) {
          return successResult(
            latest.id,
            latest.paidAt ?? paidAt,
            normalized.payments,
          );
        }

        return {
          ok: false,
          message: "Este pedido já foi finalizado com outro pagamento.",
        };
      }

      if (latest.status !== "READY") {
        return {
          ok: false,
          message: "Este pedido ainda não está pronto para recebimento.",
        };
      }

      return {
        ok: false,
        message: "Não foi possível finalizar o pedido. Tente novamente.",
      };
    }

    try {
      const recordLifecycle =
        deps.recordOrderLifecycleFunnelEvent ??
        recordOrderLifecycleFunnelEvent;
      await recordLifecycle({
        storeId: order.storeId,
        orderId: order.id,
        source: "COUNTER",
        name: "order_completed",
      });
    } catch {
      // Telemetry must never fail counter finalization.
    }

    return successResult(order.id, paidAt, normalized.payments);
  } catch {
    console.error("[finalizeCounterOrder] failed to persist finalization");
    return {
      ok: false,
      message: "Não foi possível finalizar o pedido. Tente novamente.",
    };
  }
}
