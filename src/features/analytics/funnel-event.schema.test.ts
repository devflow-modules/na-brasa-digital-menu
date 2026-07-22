import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCheckoutStartedDedupeKey,
  buildMenuViewedDedupeKey,
  buildOrderLifecycleDedupeKey,
  buildProductAddedDedupeKey,
} from "@/features/analytics/build-funnel-dedupe-key";
import { parseRecordFunnelEventInput } from "@/features/analytics/funnel-event.schema";

describe("parseRecordFunnelEventInput", () => {
  it("accepts allowlisted properties and normalizes nullables", () => {
    const parsed = parseRecordFunnelEventInput({
      storeId: " store_a ",
      name: "menu_viewed",
      dedupeKey: "menu_viewed:sess:2026-07-21",
      sessionId: "sess-1",
      orderId: null,
      productId: undefined,
      source: "DIRECT",
      quantity: null,
      clientOccurredAt: "2026-07-21T12:00:00.000Z",
    });

    assert.equal(parsed.storeId, "store_a");
    assert.equal(parsed.name, "menu_viewed");
    assert.equal(parsed.sessionId, "sess-1");
    assert.equal(parsed.orderId, null);
    assert.equal(parsed.productId, null);
    assert.equal(parsed.source, "DIRECT");
    assert.ok(parsed.clientOccurredAt instanceof Date);
  });

  it("rejects unknown event names including reserved payment_*", () => {
    assert.throws(() =>
      parseRecordFunnelEventInput({
        storeId: "store_a",
        name: "payment_started",
        dedupeKey: "payment_started:x",
      }),
    );
  });

  it("rejects unknown and forbidden properties", () => {
    assert.throws(() =>
      parseRecordFunnelEventInput({
        storeId: "store_a",
        name: "product_added",
        dedupeKey: "product_added:occ-1",
        customerPhone: "11999999999",
      }),
    );
    assert.throws(() =>
      parseRecordFunnelEventInput({
        storeId: "store_a",
        name: "product_added",
        dedupeKey: "product_added:occ-1",
        utmCampaign: "promo",
      }),
    );
  });
});

describe("funnel dedupe keys", () => {
  it("keeps product_added occurrences distinct for the same product", () => {
    const first = buildProductAddedDedupeKey("occ-1");
    const second = buildProductAddedDedupeKey("occ-2");
    assert.notEqual(first, second);
    assert.match(first, /^product_added:occ-1$/);
  });

  it("builds stable session and order lifecycle keys", () => {
    assert.equal(
      buildMenuViewedDedupeKey("sess", "2026-07-21"),
      "menu_viewed:sess:2026-07-21",
    );
    assert.equal(
      buildCheckoutStartedDedupeKey("sess"),
      "checkout_started:sess",
    );
    assert.equal(
      buildOrderLifecycleDedupeKey("order_1", "whatsapp_handoff_started"),
      "whatsapp_handoff_started:order_1",
    );
  });
});
