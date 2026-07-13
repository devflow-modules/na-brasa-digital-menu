"use client";

import { useTransition } from "react";
import { logoutAdminAction } from "@/features/admin/auth/actions/logout-action";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            await logoutAdminAction();
          } catch (error) {
            const digest =
              typeof error === "object" &&
              error !== null &&
              "digest" in error &&
              typeof (error as { digest?: unknown }).digest === "string"
                ? (error as { digest: string }).digest
                : "";

            if (digest.startsWith("NEXT_REDIRECT")) {
              return;
            }
          }
        });
      }}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
    >
      {isPending ? "Saindo..." : "Sair"}
    </button>
  );
}
