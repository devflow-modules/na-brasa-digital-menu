import type { FunnelEventName } from "@/features/analytics/funnel-event-names";

function requireToken(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required for dedupeKey`);
  }
  return trimmed;
}

/** One menu view per anonymous session per UTC calendar day. */
export function buildMenuViewedDedupeKey(
  sessionId: string,
  utcDay: string,
): string {
  return `menu_viewed:${requireToken(sessionId, "sessionId")}:${requireToken(utcDay, "utcDay")}`;
}

/**
 * Repeatable add-to-cart action.
 * `occurrenceId` must be unique per add (e.g. UUID), never only session+product.
 */
export function buildProductAddedDedupeKey(occurrenceId: string): string {
  return `product_added:${requireToken(occurrenceId, "occurrenceId")}`;
}

/** One checkout start per anonymous session. */
export function buildCheckoutStartedDedupeKey(sessionId: string): string {
  return `checkout_started:${requireToken(sessionId, "sessionId")}`;
}

/** Exactly one lifecycle marker per order. */
export function buildOrderLifecycleDedupeKey(
  orderId: string,
  name: Extract<
    FunnelEventName,
    | "order_created"
    | "whatsapp_handoff_started"
    | "order_confirmed"
    | "order_completed"
    | "order_cancelled"
  >,
): string {
  return `${name}:${requireToken(orderId, "orderId")}`;
}

export function utcDayFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
