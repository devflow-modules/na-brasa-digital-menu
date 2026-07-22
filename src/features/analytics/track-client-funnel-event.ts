import type { ClientFunnelEventName } from "@/features/analytics/funnel-event-names";
import { getOrCreateFunnelSessionId } from "@/features/analytics/funnel-session";

export type TrackClientFunnelEventInput = {
  storeSlug: string;
  name: ClientFunnelEventName;
  productId?: string;
  quantity?: number;
  occurrenceId?: string;
  orderId?: string;
};

/**
 * Fire-and-forget public funnel tracking.
 * Failures must never block cart, checkout, or WhatsApp handoff.
 */
export function trackClientFunnelEvent(
  input: TrackClientFunnelEventInput,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload = {
      storeSlug: input.storeSlug,
      name: input.name,
      sessionId: getOrCreateFunnelSessionId(),
      ...(input.productId ? { productId: input.productId } : {}),
      ...(input.quantity != null ? { quantity: input.quantity } : {}),
      ...(input.occurrenceId ? { occurrenceId: input.occurrenceId } : {}),
      ...(input.orderId ? { orderId: input.orderId } : {}),
      clientOccurredAt: new Date().toISOString(),
    };

    void fetch("/api/funnel-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // ignore
    });
  } catch {
    // ignore
  }
}

export function createFunnelOccurrenceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const r = (Math.random() * 16) | 0;
    const v = char === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
