import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isKnownIfoodFullCode,
  normalizeIfoodFullCode,
} from "@/features/ifood/ifood-known-events";

describe("ifood-known-events", () => {
  it("normalizes short codes", () => {
    assert.equal(normalizeIfoodFullCode("PLC", null), "PLACED");
    assert.equal(normalizeIfoodFullCode(null, "cancelled"), "CANCELLED");
  });

  it("detects known vs unknown", () => {
    assert.equal(isKnownIfoodFullCode("PLACED"), true);
    assert.equal(isKnownIfoodFullCode("SOMETHING_NEW"), false);
    assert.equal(isKnownIfoodFullCode(null), false);
  });
});
