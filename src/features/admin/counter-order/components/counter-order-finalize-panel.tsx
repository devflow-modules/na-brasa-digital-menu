"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReceiveAndFinalizeDialog } from "@/features/admin/counter-order/components/receive-and-finalize-dialog";
import { formatMoney } from "@/features/menu/format-money";

type CounterOrderFinalizePanelProps = {
  orderId: string;
  totalCents: number;
};

export function CounterOrderFinalizePanel({
  orderId,
  totalCents,
}: CounterOrderFinalizePanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [finalizedLocally, setFinalizedLocally] = useState(false);

  return (
    <section
      data-testid="counter-order-finalize-panel"
      className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4"
    >
      <h2 className="text-sm font-semibold text-orange-50">
        Recebimento de balcão
      </h2>
      <p className="mt-2 text-sm text-stone-300">
        Pedido pronto · total {formatMoney(totalCents)}. Informe o pagamento
        para concluir.
      </p>

      {successMessage ? (
        <p
          role="status"
          aria-live="polite"
          data-testid="counter-order-finalize-success"
          className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
        >
          {successMessage}
        </p>
      ) : null}

      {!finalizedLocally ? (
        <button
          type="button"
          data-testid="counter-order-receive-cta"
          onClick={() => {
            setSuccessMessage(null);
            setOpen(true);
          }}
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          Receber e finalizar
        </button>
      ) : null}

      {open ? (
        <ReceiveAndFinalizeDialog
          orderId={orderId}
          totalCents={totalCents}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            setFinalizedLocally(true);
            setSuccessMessage("Recebimento confirmado. Pedido concluído.");
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}
