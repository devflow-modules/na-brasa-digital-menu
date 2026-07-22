import { Prisma } from "@prisma/client";
import { parseRecordFunnelEventInput } from "@/features/analytics/funnel-event.schema";
import { prisma } from "@/lib/prisma";

export type RecordFunnelEventResult =
  | { ok: true; recorded: true }
  | { ok: true; recorded: false; reason: "duplicate" | "invalid" }
  | { ok: true; recorded: false; reason: "error" };

type FunnelEventWriter = {
  funnelEvent: {
    create: (args: {
      data: {
        storeId: string;
        name: ParsedName;
        dedupeKey: string;
        occurredAt: Date;
        clientOccurredAt: Date | null;
        sessionId: string | null;
        orderId: string | null;
        productId: string | null;
        source: ParsedSource;
        quantity: number | null;
      };
    }) => Promise<unknown>;
  };
};

type ParsedName =
  | "menu_viewed"
  | "product_added"
  | "checkout_started"
  | "order_created"
  | "whatsapp_handoff_started"
  | "order_confirmed"
  | "order_completed"
  | "order_cancelled";

type ParsedSource = "DIRECT" | "IFOOD" | "OTHER" | "COUNTER" | null;

/**
 * Appends a funnel event. Never throws to callers.
 * `occurredAt` is always set on the server; client time is auxiliary only.
 */
export async function recordFunnelEvent(
  input: unknown,
  deps: { db?: FunnelEventWriter; now?: () => Date } = {},
): Promise<RecordFunnelEventResult> {
  const db = deps.db ?? prisma;
  const now = deps.now ?? (() => new Date());

  let parsed;
  try {
    parsed = parseRecordFunnelEventInput(input);
  } catch {
    return { ok: true, recorded: false, reason: "invalid" };
  }

  try {
    await db.funnelEvent.create({
      data: {
        storeId: parsed.storeId,
        name: parsed.name,
        dedupeKey: parsed.dedupeKey,
        occurredAt: now(),
        clientOccurredAt: parsed.clientOccurredAt,
        sessionId: parsed.sessionId,
        orderId: parsed.orderId,
        productId: parsed.productId,
        source: parsed.source,
        quantity: parsed.quantity,
      },
    });
    return { ok: true, recorded: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: true, recorded: false, reason: "duplicate" };
    }
    return { ok: true, recorded: false, reason: "error" };
  }
}
