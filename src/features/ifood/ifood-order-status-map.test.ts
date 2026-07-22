import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  orderStatusFromIfoodFullCode,
  shouldUpdateOperationalStatus,
} from "@/features/ifood/ifood-order-status-map";

describe("orderStatusFromIfoodFullCode", () => {
  it("maps the #126 contract", () => {
    assert.equal(orderStatusFromIfoodFullCode("PLACED"), "PENDING");
    assert.equal(orderStatusFromIfoodFullCode("CONFIRMED"), "CONFIRMED");
    assert.equal(orderStatusFromIfoodFullCode("INTEGRATED"), "CONFIRMED");
    assert.equal(orderStatusFromIfoodFullCode("PREPARATION_STARTED"), "PREPARING");
    assert.equal(orderStatusFromIfoodFullCode("START_PREPARATION"), "PREPARING");
    assert.equal(orderStatusFromIfoodFullCode("READY_TO_PICKUP"), "READY");
    assert.equal(orderStatusFromIfoodFullCode("DISPATCHED"), "OUT_FOR_DELIVERY");
    assert.equal(orderStatusFromIfoodFullCode("CONCLUDED"), "COMPLETED");
    assert.equal(orderStatusFromIfoodFullCode("CANCELLED"), "CANCELLED");
    assert.equal(orderStatusFromIfoodFullCode("UNKNOWN"), null);
  });
});

describe("shouldUpdateOperationalStatus", () => {
  it("never regresses and always applies cancel", () => {
    assert.equal(shouldUpdateOperationalStatus("CONFIRMED", "PENDING"), false);
    assert.equal(shouldUpdateOperationalStatus("PREPARING", "CONFIRMED"), false);
    assert.equal(shouldUpdateOperationalStatus("PENDING", "CONFIRMED"), true);
    assert.equal(shouldUpdateOperationalStatus("READY", "CANCELLED"), true);
    assert.equal(shouldUpdateOperationalStatus("CANCELLED", "CONFIRMED"), false);
    assert.equal(shouldUpdateOperationalStatus("COMPLETED", "COMPLETED"), false);
  });
});
