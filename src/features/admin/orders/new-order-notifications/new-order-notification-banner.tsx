"use client";

import Link from "next/link";
import { formatMoney } from "@/features/menu/format-money";
import type { ClientNewOrderNotification } from "@/features/admin/orders/new-order-notifications/new-order-notification-controller";

type NewOrderNotificationBannerProps = {
  banners: ClientNewOrderNotification[];
  onDismiss: (orderId: string) => void;
};

export function NewOrderNotificationBanner({
  banners,
  onDismiss,
}: NewOrderNotificationBannerProps) {
  if (banners.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4"
      data-testid="admin-new-order-banner-stack"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2" aria-live="polite">
        {banners.map((banner) => (
          <article
            key={banner.id}
            className="pointer-events-auto rounded-xl border border-amber-400/40 bg-stone-950/95 p-3 shadow-lg shadow-black/40 backdrop-blur"
            data-testid="admin-new-order-banner"
            data-order-id={banner.id}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-amber-300">
              Novo pedido online
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-50">
              {banner.code} · {banner.customerName} ·{" "}
              {formatMoney(banner.totalCents)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/admin/pedidos/${banner.id}`}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-amber-500 px-3 text-sm font-semibold text-stone-950"
              >
                Abrir pedido
              </Link>
              <button
                type="button"
                onClick={() => onDismiss(banner.id)}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-600 px-3 text-sm font-medium text-stone-200"
              >
                Dispensar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
