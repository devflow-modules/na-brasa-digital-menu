"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleStoreOpenAction } from "@/features/admin/settings/actions/toggle-store-open-action";

type StoreOpenToggleProps = {
  isOpen: boolean;
  canToggle: boolean;
};

export function StoreOpenToggle({ isOpen, canToggle }: StoreOpenToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!canToggle) {
    return (
      <p
        data-testid="admin-store-open-status"
        className="text-sm text-stone-400"
      >
        Status: {isOpen ? "Aberta para pedidos" : "Fechada no momento"}
      </p>
    );
  }

  function toggle() {
    startTransition(async () => {
      const result = await toggleStoreOpenAction({ isOpen: !isOpen });
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div
      data-testid="admin-store-open-toggle"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-950/60 p-4"
    >
      <p
        data-testid="admin-store-open-status"
        className="text-sm text-stone-200"
      >
        {isOpen ? "Loja aberta para pedidos" : "Loja fechada no momento"}
      </p>
      <button
        type="button"
        data-testid="admin-store-open-toggle-button"
        disabled={isPending}
        onClick={toggle}
        className="h-9 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 text-xs font-semibold text-orange-100 disabled:opacity-60"
      >
        {isOpen ? "Fechar loja" : "Abrir loja"}
      </button>
    </div>
  );
}
