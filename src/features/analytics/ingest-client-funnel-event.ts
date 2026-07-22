import {
  buildCheckoutStartedDedupeKey,
  buildMenuViewedDedupeKey,
  buildOrderLifecycleDedupeKey,
  buildProductAddedDedupeKey,
  utcDayFromDate,
} from "@/features/analytics/build-funnel-dedupe-key";
import {
  parseClientFunnelEventIngest,
  type ClientFunnelEventIngestInput,
} from "@/features/analytics/client-funnel-event.schema";
import {
  funnelIngestRateLimiter,
  type FunnelRateLimitResult,
} from "@/features/analytics/funnel-rate-limit";
import {
  recordFunnelEvent,
  type RecordFunnelEventResult,
} from "@/features/analytics/record-funnel-event";
import { prisma } from "@/lib/prisma";

export type IngestClientFunnelEventResult =
  | { ok: true; recorded: boolean }
  | { ok: false; status: 400 | 429; retryAfterSeconds?: number };

type IngestDeps = {
  findStoreIdBySlug?: (slug: string) => Promise<string | null>;
  assertProductInStore?: (
    storeId: string,
    productId: string,
  ) => Promise<boolean>;
  assertOrderInStore?: (storeId: string, orderId: string) => Promise<boolean>;
  recordFunnelEvent?: typeof recordFunnelEvent;
  checkRateLimit?: (key: string) => FunnelRateLimitResult;
  now?: () => Date;
};

async function defaultFindStoreIdBySlug(slug: string): Promise<string | null> {
  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true },
  });
  return store?.id ?? null;
}

async function defaultAssertProductInStore(
  storeId: string,
  productId: string,
): Promise<boolean> {
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId },
    select: { id: true },
  });
  return Boolean(product);
}

async function defaultAssertOrderInStore(
  storeId: string,
  orderId: string,
): Promise<boolean> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId, source: "DIRECT" },
    select: { id: true },
  });
  return Boolean(order);
}

function buildClientDedupeKey(
  input: ClientFunnelEventIngestInput,
  now: Date,
): string {
  switch (input.name) {
    case "menu_viewed":
      return buildMenuViewedDedupeKey(input.sessionId, utcDayFromDate(now));
    case "checkout_started":
      return buildCheckoutStartedDedupeKey(input.sessionId);
    case "product_added":
      return buildProductAddedDedupeKey(input.occurrenceId!);
    case "whatsapp_handoff_started":
      return buildOrderLifecycleDedupeKey(
        input.orderId!,
        "whatsapp_handoff_started",
      );
  }
}

/**
 * Ingests a public client funnel event.
 * Resolves storeId + dedupeKey server-side; never trusts those from the client.
 */
export async function ingestClientFunnelEvent(
  rawInput: unknown,
  options: { rateLimitKey: string },
  deps: IngestDeps = {},
): Promise<IngestClientFunnelEventResult> {
  const checkRateLimit =
    deps.checkRateLimit ?? ((key) => funnelIngestRateLimiter.check(key));
  const rate = checkRateLimit(options.rateLimitKey);
  if (!rate.allowed) {
    return {
      ok: false,
      status: 429,
      retryAfterSeconds: rate.retryAfterSeconds,
    };
  }

  let parsed: ClientFunnelEventIngestInput;
  try {
    parsed = parseClientFunnelEventIngest(rawInput);
  } catch {
    return { ok: false, status: 400 };
  }

  const findStoreIdBySlug = deps.findStoreIdBySlug ?? defaultFindStoreIdBySlug;
  const storeId = await findStoreIdBySlug(parsed.storeSlug);
  if (!storeId) {
    return { ok: false, status: 400 };
  }

  if (parsed.name === "product_added") {
    const assertProduct =
      deps.assertProductInStore ?? defaultAssertProductInStore;
    const ok = await assertProduct(storeId, parsed.productId!);
    if (!ok) {
      return { ok: false, status: 400 };
    }
  }

  if (parsed.name === "whatsapp_handoff_started") {
    const assertOrder = deps.assertOrderInStore ?? defaultAssertOrderInStore;
    const ok = await assertOrder(storeId, parsed.orderId!);
    if (!ok) {
      return { ok: false, status: 400 };
    }
  }

  const now = deps.now ?? (() => new Date());
  const occurredClock = now();
  const dedupeKey = buildClientDedupeKey(parsed, occurredClock);
  const record = deps.recordFunnelEvent ?? recordFunnelEvent;

  let result: RecordFunnelEventResult;
  try {
    result = await record({
      storeId,
      name: parsed.name,
      dedupeKey,
      sessionId: parsed.sessionId,
      productId: parsed.productId ?? null,
      quantity: parsed.quantity ?? null,
      orderId: parsed.orderId ?? null,
      source: "DIRECT",
      clientOccurredAt: parsed.clientOccurredAt ?? null,
    });
  } catch {
    // Never fail the client journey because of telemetry persistence.
    return { ok: true, recorded: false };
  }

  return { ok: true, recorded: result.recorded };
}
