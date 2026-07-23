"use client";

import type { UserRole } from "@prisma/client";
import { useEffect, useState, useTransition } from "react";
import { formatAdminRoleLabel } from "@/features/admin/auth/admin-permissions";
import { executeIfoodOrderAction } from "@/features/admin/orders/actions/execute-ifood-order-action";
import {
  IFOOD_AWAITING_CONFIRMATION_MESSAGE,
  shouldShowIfoodActionAwaiting,
} from "@/features/admin/orders/admin-ifood-order-action";
import { IFOOD_EXTERNAL_STATUS_NOTE } from "@/features/admin/orders/admin-orders-formatters";
import type { AdminIfoodActionPanel } from "@/features/admin/orders/get-admin-ifood-action-panel";
import { requestAdminOrdersRefresh } from "@/features/admin/orders/live-refresh/admin-orders-refresh";

type IfoodOrderActionsProps = {
  orderId: string;
  role: UserRole;
  panel: AdminIfoodActionPanel;
};

export function IfoodOrderActions({
  orderId,
  role,
  panel,
}: IfoodOrderActionsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localAwaiting, setLocalAwaiting] = useState(false);
  const [submittedCommand, setSubmittedCommand] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const roleLabel = formatAdminRoleLabel(role);

  // When projection advances (new nextCommand / server awaiting flag), drop local sticky state (#132).
  useEffect(() => {
    setLocalAwaiting(panel.awaitingConfirmation);
    if (!panel.awaitingConfirmation) {
      setSubmittedCommand(null);
    }
    setErrorMessage(null);
  }, [panel.awaitingConfirmation, panel.nextCommand]);

  const awaiting = shouldShowIfoodActionAwaiting({
    panelAwaitingConfirmation: panel.awaitingConfirmation,
    localAwaiting,
    panelNextCommand: panel.nextCommand,
    submittedCommand,
  });

  function onExecute() {
    setErrorMessage(null);
    const commandAtClick = panel.nextCommand;

    startTransition(async () => {
      const result = await executeIfoodOrderAction({ orderId });

      if (!result.ok) {
        setErrorMessage(result.message);
        setLocalAwaiting(false);
        setSubmittedCommand(null);
        return;
      }

      if (result.status === "PENDING" || result.status === "ACCEPTED") {
        setLocalAwaiting(true);
        setSubmittedCommand(commandAtClick);
      } else {
        setLocalAwaiting(false);
        setSubmittedCommand(null);
      }

      requestAdminOrdersRefresh("status-updated");
    });
  }

  return (
    <section
      data-testid="order-status-actions"
      data-mode="ifood-external"
      className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
    >
      <h2 className="text-sm font-semibold text-orange-50">Status do pedido</h2>
      <p
        data-testid="order-status-role-note"
        className="mt-2 text-xs text-stone-500"
      >
        Perfil: {roleLabel}
      </p>
      <p
        data-testid="order-ifood-status-note"
        className="mt-3 text-sm text-stone-300"
      >
        {IFOOD_EXTERNAL_STATUS_NOTE}
      </p>

      {awaiting ? (
        <p
          data-testid="order-ifood-action-awaiting"
          className="mt-4 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-100"
          role="status"
        >
          {IFOOD_AWAITING_CONFIRMATION_MESSAGE}
        </p>
      ) : null}

      {panel.canExecute && panel.nextCommand && panel.label && !awaiting ? (
        <div className="mt-4">
          <button
            type="button"
            data-testid={`order-ifood-action-${panel.nextCommand}`}
            disabled={isPending}
            onClick={onExecute}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-stone-950 disabled:opacity-60"
          >
            {isPending ? "Enviando..." : panel.label}
          </button>
        </div>
      ) : null}

      {!awaiting && !panel.canExecute && panel.nextCommand == null ? (
        <p
          data-testid="order-ifood-action-empty"
          className="mt-4 text-sm text-stone-400"
        >
          Nenhuma ação iFood disponível neste status.
        </p>
      ) : null}

      {!awaiting &&
      !panel.canExecute &&
      panel.nextCommand != null &&
      panel.label ? (
        <p
          data-testid="order-ifood-action-denied"
          className="mt-4 text-sm text-stone-400"
        >
          Ação disponível ({panel.label}), mas não permitida para o seu perfil.
        </p>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          data-testid="order-ifood-action-error"
          className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100"
        >
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
