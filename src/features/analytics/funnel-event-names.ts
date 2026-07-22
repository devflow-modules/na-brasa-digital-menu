/**
 * Closed funnel event allowlist for issue #103.
 * Payment vocabulary is reserved for InfiniteTap (#110) and must not be emitted here.
 */
export const FUNNEL_EVENT_NAMES = [
  "menu_viewed",
  "product_added",
  "checkout_started",
  "order_created",
  "whatsapp_handoff_started",
  "order_confirmed",
  "order_completed",
  "order_cancelled",
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENT_NAMES)[number];

export const RESERVED_PAYMENT_EVENT_NAMES = [
  "payment_started",
  "payment_approved",
  "payment_declined",
  "payment_cancelled",
  "payment_unknown",
] as const;

export type ReservedPaymentEventName =
  (typeof RESERVED_PAYMENT_EVENT_NAMES)[number];

export const FUNNEL_EVENT_RETENTION_DAYS = 90;

/** Properties accepted on the recorder input (explicit allowlist). */
export const FUNNEL_EVENT_ALLOWED_INPUT_KEYS = [
  "storeId",
  "name",
  "dedupeKey",
  "sessionId",
  "orderId",
  "productId",
  "source",
  "quantity",
  "clientOccurredAt",
] as const;

export type FunnelEventAllowedInputKey =
  (typeof FUNNEL_EVENT_ALLOWED_INPUT_KEYS)[number];

/** Never persist these (defense in depth if a bag is passed). */
export const FUNNEL_EVENT_FORBIDDEN_PROPERTY_KEYS = [
  "customerName",
  "customerPhone",
  "phone",
  "email",
  "address",
  "deliveryAddress",
  "whatsappMessage",
  "notes",
  "ip",
  "userAgent",
  "password",
  "token",
] as const;
