import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCounterOrderSchema } from "@/features/orders/schemas/create-counter-order.schema";

describe("createCounterOrderSchema", () => {
  it("accepts minimal counter payload without phone or payment", () => {
    const result = createCounterOrderSchema.safeParse({
      items: [{ productId: "p1", quantity: 1 }],
    });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.deepEqual(result.data.items[0]?.addonIds, []);
  });

  it("rejects empty items and does not require trusted fields", () => {
    const empty = createCounterOrderSchema.safeParse({ items: [] });
    assert.equal(empty.success, false);

    const parsed = createCounterOrderSchema.safeParse({
      items: [{ productId: "p1", quantity: 1 }],
      storeId: "ignored",
      createdByUserId: "ignored",
      paymentMethod: "CASH",
      customerPhone: "13999999999",
    });
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(
      "storeId" in parsed.data ||
        "createdByUserId" in parsed.data ||
        "paymentMethod" in parsed.data ||
        "customerPhone" in parsed.data,
      false,
    );
  });
});
