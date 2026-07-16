import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { finalizeCounterOrderSchema } from "@/features/orders/schemas/finalize-counter-order.schema";

describe("finalizeCounterOrderSchema", () => {
  it("accepts cash without tendered amount (exact payment)", () => {
    const parsed = finalizeCounterOrderSchema.safeParse({
      orderId: "order_1",
      paymentMethod: "CASH",
    });
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.changeForCents, undefined);
  });

  it("accepts cash with tendered cents equal or greater", () => {
    const equal = finalizeCounterOrderSchema.safeParse({
      orderId: "order_1",
      paymentMethod: "CASH",
      changeForCents: 4200,
    });
    assert.equal(equal.success, true);

    const greater = finalizeCounterOrderSchema.safeParse({
      orderId: "order_1",
      paymentMethod: "CASH",
      changeForCents: 5000,
    });
    assert.equal(greater.success, true);
  });

  it("accepts pix and card without changeForCents", () => {
    assert.equal(
      finalizeCounterOrderSchema.safeParse({
        orderId: "order_1",
        paymentMethod: "PIX",
      }).success,
      true,
    );
    assert.equal(
      finalizeCounterOrderSchema.safeParse({
        orderId: "order_1",
        paymentMethod: "CARD",
      }).success,
      true,
    );
  });

  it("requires orderId and paymentMethod", () => {
    assert.equal(finalizeCounterOrderSchema.safeParse({}).success, false);
    assert.equal(
      finalizeCounterOrderSchema.safeParse({
        orderId: "order_1",
      }).success,
      false,
    );
  });

  it("rejects invalid method, negative and decimal tender", () => {
    assert.equal(
      finalizeCounterOrderSchema.safeParse({
        orderId: "order_1",
        paymentMethod: "BITCOIN",
      }).success,
      false,
    );
    assert.equal(
      finalizeCounterOrderSchema.safeParse({
        orderId: "order_1",
        paymentMethod: "CASH",
        changeForCents: -1,
      }).success,
      false,
    );
    assert.equal(
      finalizeCounterOrderSchema.safeParse({
        orderId: "order_1",
        paymentMethod: "CASH",
        changeForCents: 10.5,
      }).success,
      false,
    );
  });

  it("rejects changeForCents for pix and card", () => {
    assert.equal(
      finalizeCounterOrderSchema.safeParse({
        orderId: "order_1",
        paymentMethod: "PIX",
        changeForCents: 5000,
      }).success,
      false,
    );
    assert.equal(
      finalizeCounterOrderSchema.safeParse({
        orderId: "order_1",
        paymentMethod: "CARD",
        changeForCents: 5000,
      }).success,
      false,
    );
  });

  it("strips unknown server-controlled fields from output", () => {
    const parsed = finalizeCounterOrderSchema.safeParse({
      orderId: "order_1",
      paymentMethod: "PIX",
      storeId: "evil",
      paidAt: new Date().toISOString(),
      status: "COMPLETED",
      totalCents: 1,
    });
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.deepEqual(Object.keys(parsed.data).sort(), [
      "orderId",
      "paymentMethod",
    ]);
  });
});
