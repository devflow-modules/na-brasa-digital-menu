"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleStoreOpenAction } from "@/features/admin/settings/actions/toggle-store-open-action";

type StoreOpenToggleProps = {
  isOpen: boolean;
  canToggle: boolean;
};

export function StoreOpenToggle({ isOpen, canToggle }: StoreOpenToggleProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canToggle) {
    return (
      <div
        data-testid="admin-store-open-toggle"
        className={[
          "rounded-2xl border px-4 py-4",
          isOpen
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-stone-700 bg-stone-950/70",
        ].join(" ")}
      >
        <p
          data-testid="admin-store-open-status"
          className="text-base font-semibold text-stone-100"
        >
          {isOpen ? "Loja aberta" : "Loja fechada"}
        </p>
        <p className="mt-1 text-sm text-stone-400">
          {isOpen
            ? "Recebendo pedidos online"
            : "Novos pedidos online estão bloqueados"}
        </p>
      </div>
    );
  }

  function toggle() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await toggleStoreOpenAction({ isOpen: !isOpen });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      data-testid="admin-store-open-toggle"
      className={[
        "flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
        isOpen
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-amber-500/30 bg-amber-500/10",
      ].join(" ")}
    >
      <div>
        <p
          data-testid="admin-store-open-status"
          className="text-base font-semibold text-stone-50"
        >
          {isOpen ? "Loja aberta" : "Loja fechada"}
        </p>
        <p className="mt-1 text-sm text-stone-300">
          {isOpen
            ? "Recebendo pedidos online"
            : "Novos pedidos online estão bloqueados. Pedidos de balcão autorizados podem continuar."}
        </p>
      </div>
      <button
        type="button"
        data-testid="admin-store-open-toggle-button"
        disabled={isPending}
        onClick={toggle}
        className={[
          "h-10 shrink-0 rounded-xl px-4 text-sm font-semibold disabled:opacity-60",
          isOpen
            ? "border border-amber-400/50 bg-stone-950/40 text-amber-100"
            : "bg-orange-500 text-stone-950",
        ].join(" ")}
      >
        {isPending
          ? isOpen
            ? "Fechando..."
            : "Abrindo..."
          : isOpen
            ? "Fechar loja"
            : "Abrir loja"}
      </button>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-300 sm:basis-full">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
