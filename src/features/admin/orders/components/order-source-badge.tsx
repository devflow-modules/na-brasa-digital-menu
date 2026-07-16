import type { AdminOrderSource } from "@/features/admin/orders/admin-orders.types";
import { formatOrderSource } from "@/features/admin/orders/admin-orders-formatters";

/**
 * Visual tokens for origin — distinct from OrderStatusBadge (rounded-full + status colors).
 * Label is always the primary signal; color is secondary.
 */
const SOURCE_STYLES: Record<AdminOrderSource, string> = {
  DIRECT: "border-cyan-500/45 bg-cyan-950/50 text-cyan-100",
  COUNTER: "border-stone-400/55 bg-stone-800/90 text-stone-100",
  IFOOD: "border-rose-500/45 bg-rose-950/40 text-rose-100",
  OTHER: "border-stone-600 bg-stone-900 text-stone-300",
};

type OrderSourceBadgeProps = {
  source: AdminOrderSource;
};

export function OrderSourceBadge({ source }: OrderSourceBadgeProps) {
  const label = formatOrderSource(source);

  return (
    <span
      data-testid="order-source-badge"
      data-source={source}
      aria-label={`Origem: ${label}`}
      className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium ${SOURCE_STYLES[source]}`}
    >
      {label}
    </span>
  );
}
