"use client";

import { useCallback, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  buildFinalizePaymentsPayload,
  canConfirmCounterPaymentDraft,
  computeCashChangeCents,
  createDraftLine,
  remainingDraftCents,
  type CounterPaymentDraftLine,
  unusedPaymentMethods,
} from "@/features/admin/counter-order/counter-order-change";
import { useDialogFocusTrap } from "@/features/admin/counter-order/use-dialog-focus-trap";
import { formatMoney } from "@/features/menu/format-money";
import { finalizeCounterOrderAction } from "@/features/orders/actions/finalize-counter-order-action";
import type { CreatablePaymentMethod } from "@/features/orders/payment-method";
import { paymentMethodLabels } from "@/features/orders/payment-method";
import { parseCurrencyToCents } from "@/features/orders/utils/parse-currency-to-cents";

type ReceiveAndFinalizeDialogProps = {
  orderId: string;
  totalCents: number;
  onClose: () => void;
  onSuccess: () => void;
};

const METHOD_ORDER: CreatablePaymentMethod[] = [
  "CASH",
  "PIX",
  "DEBIT_CARD",
  "CREDIT_CARD",
];

export function ReceiveAndFinalizeDialog({
  orderId,
  totalCents,
  onClose,
  onSuccess,
}: ReceiveAndFinalizeDialogProps) {
  const [lines, setLines] = useState<CounterPaymentDraftLine[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSubmittingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const handleClose = useCallback(() => {
    if (isSubmittingRef.current) {
      return;
    }
    onClose();
  }, [onClose]);

  useDialogFocusTrap({
    open: true,
    onClose: handleClose,
    panelRef,
    initialFocusRef: closeButtonRef,
  });

  const remainingCents = useMemo(
    () => remainingDraftCents(totalCents, lines),
    [lines, totalCents],
  );
  const availableMethods = useMemo(() => unusedPaymentMethods(lines), [lines]);
  const canConfirm = canConfirmCounterPaymentDraft(totalCents, lines);

  function addMethod(method: CreatablePaymentMethod) {
    setLines((current) => {
      if (current.some((line) => line.method === method)) {
        return current;
      }
      const remaining = remainingDraftCents(totalCents, current);
      return [...current, createDraftLine(method, Math.max(0, remaining))];
    });
    setErrorMessage(null);
  }

  function removeMethod(method: CreatablePaymentMethod) {
    setLines((current) => current.filter((line) => line.method !== method));
    setErrorMessage(null);
  }

  function updateAmountInput(method: CreatablePaymentMethod, value: string) {
    setLines((current) =>
      current.map((line) => {
        if (line.method !== method) {
          return line;
        }
        const trimmed = value.trim();
        const parsed = trimmed === "" ? null : parseCurrencyToCents(trimmed);
        return {
          ...line,
          amountInput: value,
          amountCents: parsed,
        };
      }),
    );
    setErrorMessage(null);
  }

  function updateTenderedInput(method: CreatablePaymentMethod, value: string) {
    setLines((current) =>
      current.map((line) => {
        if (line.method !== method) {
          return line;
        }
        const trimmed = value.trim();
        const parsed = trimmed === "" ? null : parseCurrencyToCents(trimmed);
        return {
          ...line,
          tenderedInput: value,
          tenderedCents: parsed,
        };
      }),
    );
    setErrorMessage(null);
  }

  function handleSubmit() {
    if (!canConfirm || isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setErrorMessage(null);

    const payload = buildFinalizePaymentsPayload({ orderId, lines });

    startTransition(async () => {
      try {
        const result = await finalizeCounterOrderAction(payload);

        if (!result.ok) {
          setErrorMessage(result.message);
          return;
        }

        onSuccess();
      } finally {
        isSubmittingRef.current = false;
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={handleClose}
      />

      <div
        ref={panelRef}
        data-testid="receive-and-finalize-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-2xl border border-stone-700 bg-stone-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold text-orange-50"
            >
              Receber e finalizar
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-stone-400">
              Combine formas de pagamento até fechar o total.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            disabled={isPending}
            onClick={handleClose}
            aria-label="Fechar recebimento"
            className="rounded-lg px-2 py-1 text-sm text-stone-400 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            Fechar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">
              Total
            </p>
            <p
              data-testid="receive-finalize-total"
              className="mt-1 text-xl font-semibold text-orange-100"
            >
              {formatMoney(totalCents)}
            </p>
          </div>
          <div className="rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">
              Restante
            </p>
            <p
              data-testid="receive-remaining"
              className={`mt-1 text-xl font-semibold ${
                remainingCents === 0 ? "text-emerald-300" : "text-amber-200"
              }`}
            >
              {formatMoney(remainingCents)}
            </p>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-stone-200">
            Adicionar forma
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {METHOD_ORDER.map((method) => {
              const available = availableMethods.includes(method);
              return (
                <button
                  key={method}
                  type="button"
                  data-testid={`receive-payment-${method}`}
                  disabled={isPending || !available}
                  onClick={() => addMethod(method)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 text-sm font-semibold text-stone-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                >
                  {paymentMethodLabels[method]}
                </button>
              );
            })}
          </div>
        </fieldset>

        {lines.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {lines.map((line) => {
              const changeCents =
                line.method === "CASH" && line.amountCents != null
                  ? computeCashChangeCents(line.amountCents, line.tenderedCents)
                  : null;

              return (
                <li
                  key={line.method}
                  data-testid={`receive-payment-line-${line.method}`}
                  className="rounded-xl border border-stone-800 bg-stone-900/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-100">
                      {paymentMethodLabels[line.method]}
                    </p>
                    <button
                      type="button"
                      data-testid={`receive-remove-payment-${line.method}`}
                      disabled={isPending}
                      onClick={() => removeMethod(line.method)}
                      className="text-xs font-medium text-stone-400 hover:text-stone-100"
                    >
                      Remover
                    </button>
                  </div>

                  <label className="mt-3 block">
                    <span className="text-xs font-medium text-stone-300">
                      Valor aplicado
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={line.amountInput}
                      disabled={isPending}
                      onChange={(event) =>
                        updateAmountInput(line.method, event.target.value)
                      }
                      data-testid={`receive-payment-amount-${line.method}`}
                      className="mt-1 h-11 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                    />
                  </label>

                  {line.method === "CASH" ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <label className="block">
                        <span className="text-xs font-medium text-stone-300">
                          Valor entregue
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.tenderedInput}
                          disabled={isPending}
                          onChange={(event) =>
                            updateTenderedInput(line.method, event.target.value)
                          }
                          placeholder="Vazio = pagamento exato"
                          data-testid="receive-tendered-input"
                          className="mt-1 h-11 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                        />
                      </label>
                      <div className="flex justify-between gap-3 text-sm text-stone-300">
                        <span>Troco</span>
                        <span data-testid="receive-change-preview">
                          {changeCents == null
                            ? "—"
                            : formatMoney(changeCents)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">
            Selecione ao menos uma forma de pagamento.
          </p>
        )}

        {errorMessage ? (
          <p
            role="alert"
            data-testid="receive-finalize-error"
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100"
          >
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          data-testid="receive-finalize-confirm"
          disabled={!canConfirm || isPending}
          onClick={handleSubmit}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          {isPending ? "Confirmando…" : "Confirmar recebimento"}
        </button>
      </div>
    </div>
  );
}
