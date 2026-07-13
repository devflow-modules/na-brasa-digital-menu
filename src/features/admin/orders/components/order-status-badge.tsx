import type { AdminOrderStatus } from "@/features/admin/orders/admin-orders.types";
import { formatOrderStatus } from "@/features/admin/orders/admin-orders-formatters";

const STATUS_STYLES: Record<AdminOrderStatus, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  CONFIRMED: "border-sky-500/40 bg-sky-500/15 text-sky-100",
  PREPARING: "border-orange-500/40 bg-orange-500/15 text-orange-100",
  READY: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
  OUT_FOR_DELIVERY: "border-violet-500/40 bg-violet-500/15 text-violet-100",
  COMPLETED: "border-stone-500/40 bg-stone-500/15 text-stone-200",
  CANCELLED: "border-red-500/40 bg-red-500/15 text-red-100",
};

type OrderStatusBadgeProps = {
  status: AdminOrderStatus;
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <span
      data-testid="order-status-badge"
      data-status={status}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {formatOrderStatus(status)}
    </span>
  );
}
