type StoreStatusBadgeProps = {
  isOpen: boolean;
};

export function StoreStatusBadge({ isOpen }: StoreStatusBadgeProps) {
  return (
    <span
      className={
        isOpen
          ? "inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30"
          : "inline-flex items-center rounded-full bg-stone-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-stone-300 ring-1 ring-stone-400/30"
      }
    >
      {isOpen ? "Aberto agora" : "Fechado no momento"}
    </span>
  );
}
