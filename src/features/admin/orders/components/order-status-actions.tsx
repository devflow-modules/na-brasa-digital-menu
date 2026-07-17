"use client";

import type { UserRole } from "@prisma/client";
import { useState, useTransition } from "react";
import {
  formatAdminRoleLabel,
  getPermittedOrderStatusActions,
} from "@/features/admin/auth/admin-permissions";
import { updateOrderStatusAction } from "@/features/admin/orders/actions/update-order-status-action";
import { getOrderStatusActions } from "@/features/admin/orders/admin-order-status-transitions";
import type {
  AdminDeliveryType,
  AdminOrderSource,
  AdminOrderStatus,
} from "@/features/admin/orders/admin-orders.types";
import { filterGenericStatusActionsForOrder } from "@/features/admin/orders/counter-order-status-actions";
import { requestAdminOrdersRefresh } from "@/features/admin/orders/live-refresh/admin-orders-refresh";

type OrderStatusActionsProps = {
  orderId: string;
  status: AdminOrderStatus;
  deliveryType: AdminDeliveryType;
  role: UserRole;
  source: AdminOrderSource;
  paidAt: Date | null;
};

export function OrderStatusActions({
  orderId,
  status,
  deliveryType,
  role,
  source,
  paidAt,
}: OrderStatusActionsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const workflowActions = filterGenericStatusActionsForOrder(
    getOrderStatusActions(status, deliveryType),
    { source, paidAt },
  );
  const actions = filterGenericStatusActionsForOrder(
    getPermittedOrderStatusActions(role, status, deliveryType),
    { source, paidAt },
  );
  const roleLabel = formatAdminRoleLabel(role);
  const emptyMessage =
    workflowActions.length === 0
      ? source === "COUNTER" && paidAt == null && status === "READY"
        ? "Use Receber e finalizar para concluir este pedido de balcão."
        : "Pedido finalizado. Nenhuma ação disponível."
      : source === "COUNTER" && paidAt == null && status === "READY"
        ? "Use Receber e finalizar para concluir. Demais ações dependem do seu perfil."
        : "Nenhuma ação disponível para o seu perfil neste status.";

  if (actions.length === 0) {
    return (
      <section
        data-testid="order-status-actions"
        className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
      >
        <h2 className="text-sm font-semibold text-orange-50">
          Ações do pedido
        </h2>
        <p
          data-testid="order-status-role-note"
          className="mt-2 text-xs text-stone-500"
        >
          Perfil: {roleLabel}
        </p>
        <p
          data-testid="order-status-actions-empty"
          className="mt-3 text-sm text-stone-400"
        >
          {emptyMessage}
        </p>
      </section>
    );
  }

  function onUpdate(nextStatus: AdminOrderStatus) {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await updateOrderStatusAction({
        orderId,
        nextStatus,
      });

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      requestAdminOrdersRefresh("status-updated");
    });
  }

  const primaryActions = actions.filter((action) => action.variant !== "danger");
  const dangerActions = actions.filter((action) => action.variant === "danger");

  return (
    <section
      data-testid="order-status-actions"
      className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
    >
      <h2 className="text-sm font-semibold text-orange-50">Ações do pedido</h2>
      <p
        data-testid="order-status-role-note"
        className="mt-2 text-xs text-stone-500"
      >
        Perfil: {roleLabel}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {primaryActions.map((action) => (
          <button
            key={action.nextStatus}
            type="button"
            data-testid={`order-status-action-${action.nextStatus}`}
            disabled={isPending}
            onClick={() => onUpdate(action.nextStatus)}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60 ${
              action.variant === "primary"
                ? "bg-orange-500 text-stone-950"
                : "border border-stone-700 bg-stone-950 text-stone-100 hover:border-orange-500/40"
            }`}
          >
            {isPending ? "Atualizando..." : action.label}
          </button>
        ))}

        {dangerActions.map((action) => (
          <button
            key={action.nextStatus}
            type="button"
            data-testid={`order-status-action-${action.nextStatus}`}
            disabled={isPending}
            onClick={() => onUpdate(action.nextStatus)}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-4 text-sm font-semibold text-red-100 disabled:opacity-60"
          >
            {isPending ? "Atualizando..." : action.label}
          </button>
        ))}
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100"
        >
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
