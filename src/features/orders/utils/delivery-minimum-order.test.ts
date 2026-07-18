import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isBelowDeliveryMinimumOrder,
  requiresDeliveryMinimumOrder,
} from "@/features/orders/utils/delivery-minimum-order";

describe("requiresDeliveryMinimumOrder", () => {
  it("is true only for DELIVERY", () => {
    assert.equal(requiresDeliveryMinimumOrder("DELIVERY"), true);
    assert.equal(requiresDeliveryMinimumOrder("PICKUP"), false);
  });
});

describe("isBelowDeliveryMinimumOrder", () => {
  const minimum = 5_000;

  it("rejects DELIVERY below minimum", () => {
    assert.equal(
      isBelowDeliveryMinimumOrder({
        deliveryType: "DELIVERY",
        subtotalCents: minimum - 1,
        minimumOrderAmountCents: minimum,
      }),
      true,
    );
  });

  it("allows DELIVERY exactly at minimum", () => {
    assert.equal(
      isBelowDeliveryMinimumOrder({
        deliveryType: "DELIVERY",
        subtotalCents: minimum,
        minimumOrderAmountCents: minimum,
      }),
      false,
    );
  });

  it("allows DELIVERY above minimum", () => {
    assert.equal(
      isBelowDeliveryMinimumOrder({
        deliveryType: "DELIVERY",
        subtotalCents: minimum + 1,
        minimumOrderAmountCents: minimum,
      }),
      false,
    );
  });

  it("allows PICKUP below minimum", () => {
    assert.equal(
      isBelowDeliveryMinimumOrder({
        deliveryType: "PICKUP",
        subtotalCents: 100,
        minimumOrderAmountCents: minimum,
      }),
      false,
    );
  });

  it("allows PICKUP at and above minimum", () => {
    assert.equal(
      isBelowDeliveryMinimumOrder({
        deliveryType: "PICKUP",
        subtotalCents: minimum,
        minimumOrderAmountCents: minimum,
      }),
      false,
    );
    assert.equal(
      isBelowDeliveryMinimumOrder({
        deliveryType: "PICKUP",
        subtotalCents: minimum + 500,
        minimumOrderAmountCents: minimum,
      }),
      false,
    );
  });

  it("ignores minimum when configured as zero", () => {
    assert.equal(
      isBelowDeliveryMinimumOrder({
        deliveryType: "DELIVERY",
        subtotalCents: 0,
        minimumOrderAmountCents: 0,
      }),
      false,
    );
  });

  it("uses subtotal that may include addons (caller responsibility)", () => {
    // Product 2000 + addon 500 = 2500 < 5000 → below for delivery
    assert.equal(
      isBelowDeliveryMinimumOrder({
        deliveryType: "DELIVERY",
        subtotalCents: 2_500,
        minimumOrderAmountCents: minimum,
      }),
      true,
    );
    assert.equal(
      isBelowDeliveryMinimumOrder({
        deliveryType: "PICKUP",
        subtotalCents: 2_500,
        minimumOrderAmountCents: minimum,
      }),
      false,
    );
  });
});
