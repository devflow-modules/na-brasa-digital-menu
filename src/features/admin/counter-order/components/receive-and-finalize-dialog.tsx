"use client";

import { useCallback, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  buildFinalizeCounterOrderPayload,
  computeCashChangeCents,
  isCashTenderValid,
} from "@/features/admin/counter-order/counter-order-change";
import { useDialogFocusTrap } from "@/features/admin/counter-order/use-dialog-focus-trap";
import { formatMoney } from "@/features/menu/format-money";
import { finalizeCounterOrderAction } from "@/features/orders/actions/finalize-counter-order-action";
import { parseCurrencyToCents } from "@/features/orders/utils/parse-currency-to-cents";

type PaymentMethod = "CASH" | "PIX" | "DEBIT_CARD" | "CREDIT_CARD";

type ReceiveAndFinalizeDialogProps = {
  orderId: string;
  totalCents: number;
  onClose: () => void;
  onSuccess: () => void;
};

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "Pix" },
  { value: "DEBIT_CARD", label: "Cartão de débito" },
  { value: "CREDIT_CARD", label: "Cartão de crédito" },
];

export function ReceiveAndFinalizeDialog({
  orderId,
  totalCents,
  onClose,
  onSuccess,
}: ReceiveAndFinalizeDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [tenderedInput, setTenderedInput] = useState("");
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

  const tenderedCents = useMemo(() => {
    if (paymentMethod !== "CASH") {
      return null;
    }
    const trimmed = tenderedInput.trim();
    if (!trimmed) {
      return null;
    }
    return parseCurrencyToCents(trimmed);
  }, [paymentMethod, tenderedInput]);

  const changeCents = useMemo(() => {
    if (paymentMethod !== "CASH") {
      return null;
    }
    return computeCashChangeCents(totalCents, tenderedCents);
  }, [paymentMethod, tenderedCents, totalCents]);

  const canConfirm =
    paymentMethod != null &&
    (paymentMethod !== "CASH" ||
      (tenderedCents !== null
        ? isCashTenderValid(totalCents, tenderedCents)
        : tenderedInput.trim() === ""));

  function handleSubmit() {
    if (!paymentMethod || !canConfirm || isPending || isSubmittingRef.current) {
      return;
    }

    if (
      paymentMethod === "CASH" &&
      tenderedInput.trim() !== "" &&
      tenderedCents == null
    ) {
      setErrorMessage("Informe um valor válido em reais.");
      return;
    }

    if (
      paymentMethod === "CASH" &&
      tenderedCents != null &&
      !isCashTenderValid(totalCents, tenderedCents)
    ) {
      setErrorMessage("Informe um valor igual ou maior que o total.");
      return;
    }

    isSubmittingRef.current = true;
    setErrorMessage(null);

    const payload = buildFinalizeCounterOrderPayload({
      orderId,
      paymentMethod,
      tenderedCents: paymentMethod === "CASH" ? tenderedCents : null,
    });

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
              Confirme o recebimento para concluir a comanda.
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

        <div className="rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Total do pedido
          </p>
          <p
            data-testid="receive-finalize-total"
            className="mt-1 text-xl font-semibold text-orange-100"
          >
            {formatMoney(totalCents)}
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-stone-200">
            Forma de pagamento
          </legend>
          <div
            role="radiogroup"
            aria-label="Forma de pagamento"
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {METHODS.map((method) => {
              const selected = paymentMethod === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`receive-payment-${method.value}`}
                  disabled={isPending}
                  onClick={() => {
                    setPaymentMethod(method.value);
                    setErrorMessage(null);
                    if (method.value !== "CASH") {
                      setTenderedInput("");
                    }
                  }}
                  className={`inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${
                    selected
                      ? "bg-orange-500 text-stone-950"
                      : "border border-stone-700 bg-stone-900 text-stone-100"
                  }`}
                >
                  {method.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {paymentMethod === "CASH" ? (
          <div className="flex flex-col gap-3">
            <label className="block">
              <span className="text-sm font-medium text-stone-200">
                Valor entregue
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={tenderedInput}
                disabled={isPending}
                onChange={(event) => {
                  setTenderedInput(event.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Vazio = pagamento exato"
                data-testid="receive-tendered-input"
                className="mt-2 h-11 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100 placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
              />
              <span className="mt-1 block text-xs text-stone-500">
                Deixe vazio para pagamento exato.
              </span>
            </label>

            <div className="rounded-xl border border-stone-800 bg-stone-900/50 px-3 py-2 text-sm text-stone-300">
              <div className="flex justify-between gap-3">
                <span>Troco</span>
                <span data-testid="receive-change-preview">
                  {changeCents == null
                    ? "—"
                    : formatMoney(changeCents)}
                </span>
              </div>
            </div>
          </div>
        ) : null}

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
