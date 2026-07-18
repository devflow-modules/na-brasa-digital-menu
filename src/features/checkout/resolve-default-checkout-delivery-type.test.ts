import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOnlineCheckoutAvailable,
  resolveDefaultCheckoutDeliveryType,
} from "@/features/checkout/resolve-default-checkout-delivery-type";

describe("resolveDefaultCheckoutDeliveryType", () => {
  it("defaults to PICKUP when pickup is available", () => {
    assert.equal(
      resolveDefaultCheckoutDeliveryType({
        pickupEnabled: true,
        deliveryEnabled: true,
      }),
      "PICKUP",
    );
    assert.equal(
      resolveDefaultCheckoutDeliveryType({
        pickupEnabled: true,
        deliveryEnabled: false,
      }),
      "PICKUP",
    );
  });

  it("defaults to DELIVERY when only delivery is available", () => {
    assert.equal(
      resolveDefaultCheckoutDeliveryType({
        pickupEnabled: false,
        deliveryEnabled: true,
      }),
      "DELIVERY",
    );
  });

  it("returns null when no Online modality is available", () => {
    assert.equal(
      resolveDefaultCheckoutDeliveryType({
        pickupEnabled: false,
        deliveryEnabled: false,
      }),
      null,
    );
  });
});

describe("isOnlineCheckoutAvailable", () => {
  it("is false only when both modalities are disabled", () => {
    assert.equal(
      isOnlineCheckoutAvailable({
        pickupEnabled: false,
        deliveryEnabled: false,
      }),
      false,
    );
    assert.equal(
      isOnlineCheckoutAvailable({
        pickupEnabled: true,
        deliveryEnabled: false,
      }),
      true,
    );
  });
});
