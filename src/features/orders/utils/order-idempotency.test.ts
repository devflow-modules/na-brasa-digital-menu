import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrderIdempotencyCanonicalPayload,
  computeOrderIdempotencyFingerprint,
} from "@/features/orders/utils/order-idempotency";
import type { PreparedOrderItem } from "@/features/orders/types";

const SECRET = "test-idempotency-secret-min-16";

function pricedItem(
  productId: string,
  addonIds: string[],
  unitPriceCents: number,
): PreparedOrderItem {
  return {
    productId,
    productNameSnapshot: "Item",
    productDescriptionSnapshot: null,
    quantity: 1,
    unitPriceCents,
    totalCents: unitPriceCents,
    notes: null,
    addons: addonIds.map((addonId) => ({
      addonId,
      addonNameSnapshot: "Addon",
      addonPriceCents: 0,
    })),
  };
}

describe("order idempotency canonical + fingerprint", () => {
  it("produces stable fingerprint regardless of item and addon order", () => {
    const base = {
      storeId: "store_1",
      customerName: "Cliente",
      customerPhone: "11999999999",
      deliveryType: "PICKUP" as const,
      deliveryAddress: null,
      paymentMethod: "PIX" as const,
      changeForCents: null,
      notes: null,
      subtotalCents: 2_000,
      deliveryFeeCents: 0,
      totalCents: 2_000,
    };

    const payloadA = buildOrderIdempotencyCanonicalPayload({
      ...base,
      pricedItems: [
        pricedItem("p2", ["a2", "a1"], 1_000),
        pricedItem("p1", [], 1_000),
      ],
      clientItems: [
        { productId: "p2", quantity: 1, addonIds: ["a1", "a2"] },
        { productId: "p1", quantity: 1, addonIds: [] },
      ],
    });

    const payloadB = buildOrderIdempotencyCanonicalPayload({
      ...base,
      pricedItems: [
        pricedItem("p1", [], 1_000),
        pricedItem("p2", ["a2", "a1"], 1_000),
      ],
      clientItems: [
        { productId: "p1", quantity: 1, addonIds: [] },
        { productId: "p2", quantity: 1, addonIds: ["a2", "a1"] },
      ],
    });

    const fpA = computeOrderIdempotencyFingerprint(SECRET, payloadA);
    const fpB = computeOrderIdempotencyFingerprint(SECRET, payloadB);
    assert.equal(fpA, fpB);
  });

  it("changes fingerprint when checkout content changes", () => {
    const shared = {
      storeId: "store_1",
      customerName: "Cliente",
      customerPhone: "11999999999",
      deliveryType: "PICKUP" as const,
      deliveryAddress: null,
      paymentMethod: "PIX" as const,
      changeForCents: null,
      notes: null,
      subtotalCents: 1_000,
      deliveryFeeCents: 0,
      totalCents: 1_000,
      pricedItems: [pricedItem("p1", [], 1_000)],
      clientItems: [{ productId: "p1", quantity: 1, addonIds: [] }],
    };

    const first = computeOrderIdempotencyFingerprint(
      SECRET,
      buildOrderIdempotencyCanonicalPayload(shared),
    );
    const second = computeOrderIdempotencyFingerprint(
      SECRET,
      buildOrderIdempotencyCanonicalPayload({
        ...shared,
        customerPhone: "11888888888",
      }),
    );
    assert.notEqual(first, second);
  });
});
