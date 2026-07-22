import { buildOrderLifecycleDedupeKey } from "@/features/analytics/build-funnel-dedupe-key";
import {
  recordFunnelEvent,
  type RecordFunnelEventResult,
} from "@/features/analytics/record-funnel-event";

export type OrderLifecycleFunnelEventName =
  | "order_created"
  | "order_confirmed"
  | "order_completed"
  | "order_cancelled";

export type OrderLifecycleFunnelSource = "DIRECT" | "COUNTER" | "IFOOD" | "OTHER";

export type RecordOrderLifecycleFunnelEventInput = {
  storeId: string;
  orderId: string;
  source: OrderLifecycleFunnelSource;
  name: OrderLifecycleFunnelEventName;
};

/**
 * Records an order lifecycle funnel event from persisted order identity only.
 * Never throws — operational flows must ignore telemetry failures.
 */
export async function recordOrderLifecycleFunnelEvent(
  input: RecordOrderLifecycleFunnelEventInput,
  deps: {
    recordFunnelEvent?: typeof recordFunnelEvent;
  } = {},
): Promise<RecordFunnelEventResult> {
  const record = deps.recordFunnelEvent ?? recordFunnelEvent;

  try {
    return await record({
      storeId: input.storeId,
      orderId: input.orderId,
      source: input.source,
      name: input.name,
      dedupeKey: buildOrderLifecycleDedupeKey(input.orderId, input.name),
    });
  } catch {
    return { ok: true, recorded: false, reason: "error" };
  }
}

export function lifecycleFunnelEventForStatus(
  status: string,
): OrderLifecycleFunnelEventName | null {
  switch (status) {
    case "CONFIRMED":
      return "order_confirmed";
    case "COMPLETED":
      return "order_completed";
    case "CANCELLED":
      return "order_cancelled";
    default:
      return null;
  }
}
