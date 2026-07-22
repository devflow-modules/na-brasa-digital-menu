import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseClientFunnelEventIngest } from "@/features/analytics/client-funnel-event.schema";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const OCCURRENCE_ID = "22222222-2222-4222-8222-222222222222";

describe("parseClientFunnelEventIngest", () => {
  it("accepts menu_viewed with storeSlug and sessionId", () => {
    const parsed = parseClientFunnelEventIngest({
      storeSlug: "na-brasa",
      name: "menu_viewed",
      sessionId: SESSION_ID,
      clientOccurredAt: "2026-07-21T12:00:00.000Z",
    });

    assert.equal(parsed.name, "menu_viewed");
    assert.equal(parsed.storeSlug, "na-brasa");
    assert.equal(parsed.sessionId, SESSION_ID);
  });

  it("requires occurrenceId and productId for product_added", () => {
    assert.throws(() =>
      parseClientFunnelEventIngest({
        storeSlug: "na-brasa",
        name: "product_added",
        sessionId: SESSION_ID,
        productId: "prod_1",
      }),
    );

    const parsed = parseClientFunnelEventIngest({
      storeSlug: "na-brasa",
      name: "product_added",
      sessionId: SESSION_ID,
      productId: "prod_1",
      quantity: 2,
      occurrenceId: OCCURRENCE_ID,
    });
    assert.equal(parsed.occurrenceId, OCCURRENCE_ID);
    assert.equal(parsed.quantity, 2);
  });

  it("requires orderId for whatsapp_handoff_started", () => {
    assert.throws(() =>
      parseClientFunnelEventIngest({
        storeSlug: "na-brasa",
        name: "whatsapp_handoff_started",
        sessionId: SESSION_ID,
      }),
    );
  });

  it("rejects client-supplied storeId and dedupeKey", () => {
    assert.throws(() =>
      parseClientFunnelEventIngest({
        storeSlug: "na-brasa",
        storeId: "store_a",
        name: "menu_viewed",
        sessionId: SESSION_ID,
      }),
    );
    assert.throws(() =>
      parseClientFunnelEventIngest({
        storeSlug: "na-brasa",
        dedupeKey: "menu_viewed:x",
        name: "menu_viewed",
        sessionId: SESSION_ID,
      }),
    );
  });

  it("rejects PII and lifecycle-only event names", () => {
    assert.throws(() =>
      parseClientFunnelEventIngest({
        storeSlug: "na-brasa",
        name: "menu_viewed",
        sessionId: SESSION_ID,
        customerPhone: "11999999999",
      }),
    );
    assert.throws(() =>
      parseClientFunnelEventIngest({
        storeSlug: "na-brasa",
        name: "order_created",
        sessionId: SESSION_ID,
      }),
    );
  });
});
