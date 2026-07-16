"use client";

type NewOrderPendingBadgeProps = {
  pendingCount: number;
  visible: boolean;
};

export function NewOrderPendingBadge({
  pendingCount,
  visible,
}: NewOrderPendingBadgeProps) {
  if (!visible || pendingCount <= 0) {
    return null;
  }

  return (
    <span
      className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-stone-950"
      data-testid="admin-pending-count-badge"
      title="Pedidos pendentes"
      aria-label={`${pendingCount} pedidos pendentes`}
    >
      {pendingCount > 99 ? "99+" : pendingCount}
    </span>
  );
}
