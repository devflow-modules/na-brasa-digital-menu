import type { OrderStatus } from "@prisma/client";

const STATUS_RANK: Record<OrderStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  READY: 3,
  OUT_FOR_DELIVERY: 4,
  COMPLETED: 5,
  CANCELLED: 6,
};

/** Map confirmed iFood fullCode → local OrderStatus (#126). */
export function orderStatusFromIfoodFullCode(
  fullCode: string | null | undefined,
): OrderStatus | null {
  switch (fullCode) {
    case "PLACED":
      return "PENDING";
    case "CONFIRMED":
    case "INTEGRATED":
      return "CONFIRMED";
    case "PREPARATION_STARTED":
    case "START_PREPARATION":
      return "PREPARING";
    case "READY_TO_PICKUP":
      return "READY";
    case "DISPATCHED":
      return "OUT_FOR_DELIVERY";
    case "CONCLUDED":
      return "COMPLETED";
    case "CANCELLED":
    case "ORDER_CANCELLED":
      return "CANCELLED";
    default:
      return null;
  }
}

/** Advance-only (CANCELLED always applies). Never regress by poll/event order. */
export function shouldUpdateOperationalStatus(
  current: OrderStatus,
  next: OrderStatus,
): boolean {
  if (current === next) return false;
  if (next === "CANCELLED") return current !== "CANCELLED";
  if (current === "CANCELLED") return false;
  return STATUS_RANK[next] > STATUS_RANK[current];
}
