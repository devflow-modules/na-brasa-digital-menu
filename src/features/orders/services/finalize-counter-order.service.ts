import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  hasAdminPermission,
} from "@/features/admin/auth/admin-permissions";
import { isTransitionAllowed } from "@/features/admin/orders/admin-order-status-transitions";
import {
  findOrderForCounterFinalize,
  finalizeCounterOrderPayment,
} from "@/features/admin/orders/admin-orders.repository";
import { finalizeCounterOrderSchema } from "@/features/orders/schemas/finalize-counter-order.schema";
import type { UserRole } from "@prisma/client";

export type FinalizeCounterOrderContext = {
  storeId: string;
  role: UserRole;
};

export type FinalizeCounterOrderResult =
  | {
      ok: true;
      orderId: string;
      status: "COMPLETED";
      paymentMethod: "CASH" | "PIX" | "DEBIT_CARD" | "CREDIT_CARD";
      paidAt: string;
      changeForCents: number | null;
    }
  | { ok: false; message: string };

export type FinalizeCounterOrderDeps = {
  findOrderForCounterFinalize: typeof findOrderForCounterFinalize;
  finalizeCounterOrderPayment: typeof finalizeCounterOrderPayment;
  now: () => Date;
};

const defaultDeps: FinalizeCounterOrderDeps = {
  findOrderForCounterFinalize,
  finalizeCounterOrderPayment,
  now: () => new Date(),
};

function firstZodMessage(error: {
  issues: Array<{ message: string }>;
}): string {
  return error.issues[0]?.message ?? "Dados inválidos para finalizar o pedido.";
}

/**
 * Atomic COUNTER payment confirmation + COMPLETED.
 * Tenant/role come from trusted admin context — never from client payload.
 */
export async function finalizeCounterOrder(
  context: FinalizeCounterOrderContext,
  rawInput: unknown,
  deps: FinalizeCounterOrderDeps = defaultDeps,
): Promise<FinalizeCounterOrderResult> {
  if (!hasAdminPermission(context.role, "orders.status.complete")) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = finalizeCounterOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, message: firstZodMessage(parsed.error) };
  }

  const input = parsed.data;
  const order = await deps.findOrderForCounterFinalize(
    input.orderId,
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

  if (order.status === "COMPLETED" || order.paidAt != null) {
    return { ok: false, message: "Este pedido já foi finalizado." };
  }

  if (order.status !== "READY") {
    return {
      ok: false,
      message: "Este pedido ainda não está pronto para recebimento.",
    };
  }

  if (
    !isTransitionAllowed(order.status, "COMPLETED", order.deliveryType)
  ) {
    return { ok: false, message: "Transição de status não permitida." };
  }

  let changeForCents: number | null = null;

  if (input.paymentMethod === "CASH") {
    if (input.changeForCents !== undefined) {
      if (input.changeForCents < order.totalCents) {
        return {
          ok: false,
          message: "Informe um valor igual ou maior que o total.",
        };
      }
      changeForCents = input.changeForCents;
    }
  }

  const paidAt = deps.now();

  try {
    const result = await deps.finalizeCounterOrderPayment({
      orderId: order.id,
      storeId: context.storeId,
      paymentMethod: input.paymentMethod,
      changeForCents,
      paidAt,
    });

    if (!result.updated) {
      const latest = await deps.findOrderForCounterFinalize(
        input.orderId,
        context.storeId,
      );

      if (!latest || latest.storeId !== context.storeId) {
        return { ok: false, message: "Pedido não encontrado." };
      }

      if (latest.status === "COMPLETED" || latest.paidAt != null) {
        return { ok: false, message: "Este pedido já foi finalizado." };
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

    return {
      ok: true,
      orderId: order.id,
      status: "COMPLETED",
      paymentMethod: input.paymentMethod,
      paidAt: paidAt.toISOString(),
      changeForCents,
    };
  } catch {
    console.error("[finalizeCounterOrder] failed to persist finalization");
    return {
      ok: false,
      message: "Não foi possível finalizar o pedido. Tente novamente.",
    };
  }
}
