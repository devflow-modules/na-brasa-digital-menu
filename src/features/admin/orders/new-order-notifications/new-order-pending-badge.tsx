"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Canonical admin queue (orders list). There is no `/admin/pedidos` list route. */
export const ADMIN_ORDERS_QUEUE_HREF = "/admin";

type NewOrderPendingBadgeProps = {
  pendingCount: number;
  visible: boolean;
  /** Icon/count-only presentation for the compact admin shell. */
  compact?: boolean;
};

export function formatPendingBadgeCountLabel(pendingCount: number): string {
  return pendingCount > 99 ? "99+" : String(pendingCount);
}

/**
 * Accessible name for the pending queue link.
 * Badge = all PENDING sources; not unread notifications / DIRECT-only.
 */
export function formatPendingBadgeAriaLabel(pendingCount: number): string {
  if (pendingCount > 99) {
    return "Abrir fila com mais de 99 pedidos pendentes de todas as origens";
  }

  const noun =
    pendingCount === 1 ? "pedido pendente" : "pedidos pendentes";
  return `Abrir fila com ${pendingCount} ${noun} de todas as origens`;
}

/** `aria-current="page"` only on the exact queue route — never on other admin paths. */
export function shouldMarkPendingBadgeCurrent(
  pathname: string | null,
): boolean {
  return pathname === ADMIN_ORDERS_QUEUE_HREF;
}

export function NewOrderPendingBadge({
  pendingCount,
  visible,
  compact = false,
}: NewOrderPendingBadgeProps) {
  const pathname = usePathname();

  if (!visible || pendingCount <= 0) {
    return null;
  }

  const countLabel = formatPendingBadgeCountLabel(pendingCount);
  const onQueue = shouldMarkPendingBadgeCurrent(pathname);

  return (
    <Link
      href={ADMIN_ORDERS_QUEUE_HREF}
      data-testid="admin-pending-count-badge"
      aria-label={formatPendingBadgeAriaLabel(pendingCount)}
      aria-current={onQueue ? "page" : undefined}
      title="Pedidos pendentes de todas as origens (online e balcão)"
      className={[
        "inline-flex h-9 items-center rounded-[10px] text-sm text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60",
        compact ? "gap-1 px-0.5" : "gap-1.5 px-1",
      ].join(" ")}
    >
      {compact ? null : <span className="font-medium">Pendentes</span>}
      <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-stone-950">
        {countLabel}
      </span>
    </Link>
  );
}
