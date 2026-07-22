import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ingestClientFunnelEvent } from "@/features/analytics/ingest-client-funnel-event";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const OCCURRENCE_ID = "22222222-2222-4222-8222-222222222222";

describe("ingestClientFunnelEvent", () => {
  it("resolves storeId and dedupeKey server-side for menu_viewed", async () => {
    const recorded: unknown[] = [];
    const fixedNow = new Date("2026-07-21T15:30:00.000Z");

    const result = await ingestClientFunnelEvent(
      {
        storeSlug: "na-brasa",
        name: "menu_viewed",
        sessionId: SESSION_ID,
      },
      { rateLimitKey: "test:menu" },
      {
        findStoreIdBySlug: async () => "store_a",
        checkRateLimit: () => ({ allowed: true }),
        now: () => fixedNow,
        recordFunnelEvent: async (input) => {
          recorded.push(input);
          return { ok: true, recorded: true };
        },
      },
    );

    assert.deepEqual(result, { ok: true, recorded: true });
    assert.equal(recorded.length, 1);
    assert.deepEqual(recorded[0], {
      storeId: "store_a",
      name: "menu_viewed",
      dedupeKey: `menu_viewed:${SESSION_ID}:2026-07-21`,
      sessionId: SESSION_ID,
      productId: null,
      quantity: null,
      orderId: null,
      source: "DIRECT",
      clientOccurredAt: null,
    });
  });

  it("dedupes product_added by occurrenceId and validates product ownership", async () => {
    const recorded: unknown[] = [];
    let productChecks = 0;

    const result = await ingestClientFunnelEvent(
      {
        storeSlug: "na-brasa",
        name: "product_added",
        sessionId: SESSION_ID,
        productId: "prod_1",
        quantity: 2,
        occurrenceId: OCCURRENCE_ID,
      },
      { rateLimitKey: "test:add" },
      {
        findStoreIdBySlug: async () => "store_a",
        assertProductInStore: async (storeId, productId) => {
          productChecks += 1;
          assert.equal(storeId, "store_a");
          assert.equal(productId, "prod_1");
          return true;
        },
        checkRateLimit: () => ({ allowed: true }),
        recordFunnelEvent: async (input) => {
          recorded.push(input);
          return { ok: true, recorded: true };
        },
      },
    );

    assert.deepEqual(result, { ok: true, recorded: true });
    assert.equal(productChecks, 1);
    assert.equal(
      (recorded[0] as { dedupeKey: string }).dedupeKey,
      `product_added:${OCCURRENCE_ID}`,
    );
  });

  it("rejects unknown store, foreign product, and rate-limited traffic", async () => {
    const missingStore = await ingestClientFunnelEvent(
      {
        storeSlug: "missing",
        name: "menu_viewed",
        sessionId: SESSION_ID,
      },
      { rateLimitKey: "test:miss" },
      {
        findStoreIdBySlug: async () => null,
        checkRateLimit: () => ({ allowed: true }),
      },
    );
    assert.deepEqual(missingStore, { ok: false, status: 400 });

    const badProduct = await ingestClientFunnelEvent(
      {
        storeSlug: "na-brasa",
        name: "product_added",
        sessionId: SESSION_ID,
        productId: "prod_x",
        occurrenceId: OCCURRENCE_ID,
      },
      { rateLimitKey: "test:prod" },
      {
        findStoreIdBySlug: async () => "store_a",
        assertProductInStore: async () => false,
        checkRateLimit: () => ({ allowed: true }),
      },
    );
    assert.deepEqual(badProduct, { ok: false, status: 400 });

    const limited = await ingestClientFunnelEvent(
      {
        storeSlug: "na-brasa",
        name: "menu_viewed",
        sessionId: SESSION_ID,
      },
      { rateLimitKey: "test:rl" },
      {
        checkRateLimit: () => ({ allowed: false, retryAfterSeconds: 42 }),
      },
    );
    assert.deepEqual(limited, {
      ok: false,
      status: 429,
      retryAfterSeconds: 42,
    });
  });

  it("returns ok when recorder throws so checkout is never blocked", async () => {
    const result = await ingestClientFunnelEvent(
      {
        storeSlug: "na-brasa",
        name: "checkout_started",
        sessionId: SESSION_ID,
      },
      { rateLimitKey: "test:fail" },
      {
        findStoreIdBySlug: async () => "store_a",
        checkRateLimit: () => ({ allowed: true }),
        recordFunnelEvent: async () => {
          throw new Error("db down");
        },
      },
    );

    assert.deepEqual(result, { ok: true, recorded: false });
  });

  it("validates DIRECT order ownership for whatsapp_handoff_started", async () => {
    const recorded: unknown[] = [];

    const result = await ingestClientFunnelEvent(
      {
        storeSlug: "na-brasa",
        name: "whatsapp_handoff_started",
        sessionId: SESSION_ID,
        orderId: "order_1",
      },
      { rateLimitKey: "test:wa" },
      {
        findStoreIdBySlug: async () => "store_a",
        assertOrderInStore: async (storeId, orderId) => {
          assert.equal(storeId, "store_a");
          assert.equal(orderId, "order_1");
          return true;
        },
        checkRateLimit: () => ({ allowed: true }),
        recordFunnelEvent: async (input) => {
          recorded.push(input);
          return { ok: true, recorded: true };
        },
      },
    );

    assert.deepEqual(result, { ok: true, recorded: true });
    assert.equal(
      (recorded[0] as { dedupeKey: string }).dedupeKey,
      "whatsapp_handoff_started:order_1",
    );
  });
});
