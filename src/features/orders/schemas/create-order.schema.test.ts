import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOrderSchema } from "@/features/orders/schemas/create-order.schema";

const validBase = {
  storeSlug: "na-brasa",
  customerName: "Maria Silva",
  customerPhone: "13988887777",
  deliveryType: "PICKUP" as const,
  paymentMethod: "PIX" as const,
  items: [{ productId: "prod_1", quantity: 1, addonIds: [] as string[] }],
};

describe("createOrderSchema public DIRECT regression", () => {
  it("still requires customerPhone", () => {
    const result = createOrderSchema.safeParse({
      ...validBase,
      customerPhone: "",
    });
    assert.equal(result.success, false);
  });

  it("still requires paymentMethod", () => {
    const withoutPayment = {
      storeSlug: validBase.storeSlug,
      customerName: validBase.customerName,
      customerPhone: validBase.customerPhone,
      deliveryType: validBase.deliveryType,
      items: validBase.items,
    };
    const result = createOrderSchema.safeParse(withoutPayment);
    assert.equal(result.success, false);
  });

  it("accepts a valid public payload", () => {
    const result = createOrderSchema.safeParse(validBase);
    assert.equal(result.success, true);
  });

  it("still requires storeSlug and deliveryType for DIRECT", () => {
    const withoutStore = createOrderSchema.safeParse({
      customerName: validBase.customerName,
      customerPhone: validBase.customerPhone,
      deliveryType: validBase.deliveryType,
      paymentMethod: validBase.paymentMethod,
      items: validBase.items,
    });
    assert.equal(withoutStore.success, false);

    const withoutDelivery = createOrderSchema.safeParse({
      storeSlug: validBase.storeSlug,
      customerName: validBase.customerName,
      customerPhone: validBase.customerPhone,
      paymentMethod: validBase.paymentMethod,
      items: validBase.items,
    });
    assert.equal(withoutDelivery.success, false);
  });
});
