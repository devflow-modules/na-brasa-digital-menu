type StoreStatusBadgeProps = {
  isOpen: boolean;
};

export function StoreStatusBadge({ isOpen }: StoreStatusBadgeProps) {
  return (
    <span
      data-testid="store-status-badge"
      className={
        isOpen
          ? "inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/40"
          : "inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-100 ring-1 ring-amber-400/40"
      }
    >
      {isOpen ? "Aberto para pedidos" : "Fechado no momento"}
    </span>
  );
}
