import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_ORDER_QUEUE_Q_MAX,
  buildAdminOrderQueueWhere,
  hasAdminOrderQueueFilters,
  parseAdminOrderQueueSearchParams,
} from "@/features/admin/orders/admin-order-queue-filters";

describe("parseAdminOrderQueueSearchParams", () => {
  it("returns empty filters when params are absent", () => {
    assert.deepEqual(parseAdminOrderQueueSearchParams({}), {});
  });

  it("accepts a valid status", () => {
    assert.deepEqual(parseAdminOrderQueueSearchParams({ status: "PENDING" }), {
      status: "PENDING",
    });
  });

  it("ignores an invalid status", () => {
    assert.deepEqual(parseAdminOrderQueueSearchParams({ status: "NOPE" }), {});
  });

  it("accepts a valid source", () => {
    assert.deepEqual(parseAdminOrderQueueSearchParams({ source: "COUNTER" }), {
      source: "COUNTER",
    });
  });

  it("ignores an invalid source", () => {
    assert.deepEqual(parseAdminOrderQueueSearchParams({ source: "UBER" }), {});
  });

  it("trims q", () => {
    assert.deepEqual(parseAdminOrderQueueSearchParams({ q: "  ABC123  " }), {
      q: "ABC123",
    });
  });

  it("treats blank q as absent", () => {
    assert.deepEqual(parseAdminOrderQueueSearchParams({ q: "   " }), {});
  });

  it("ignores q above the max length", () => {
    const tooLong = "a".repeat(ADMIN_ORDER_QUEUE_Q_MAX + 1);
    assert.deepEqual(parseAdminOrderQueueSearchParams({ q: tooLong }), {});
  });

  it("combines status, source and q", () => {
    assert.deepEqual(
      parseAdminOrderQueueSearchParams({
        status: "READY",
        source: "DIRECT",
        q: "gustavo",
      }),
      {
        status: "READY",
        source: "DIRECT",
        q: "gustavo",
      },
    );
  });

  it("keeps valid params when siblings are invalid", () => {
    assert.deepEqual(
      parseAdminOrderQueueSearchParams({
        status: "NOT_A_STATUS",
        source: "COUNTER",
        q: "mesa-2",
      }),
      {
        source: "COUNTER",
        q: "mesa-2",
      },
    );
  });

  it("uses the first value when a param is an array", () => {
    assert.deepEqual(
      parseAdminOrderQueueSearchParams({
        status: ["PENDING", "READY"],
        source: ["DIRECT"],
      }),
      {
        status: "PENDING",
        source: "DIRECT",
      },
    );
  });
});

describe("hasAdminOrderQueueFilters", () => {
  it("detects active filters", () => {
    assert.equal(hasAdminOrderQueueFilters({}), false);
    assert.equal(hasAdminOrderQueueFilters({ status: "PENDING" }), true);
    assert.equal(hasAdminOrderQueueFilters({ source: "COUNTER" }), true);
    assert.equal(hasAdminOrderQueueFilters({ q: "x" }), true);
  });
});

describe("buildAdminOrderQueueWhere", () => {
  it("always scopes to storeId", () => {
    assert.deepEqual(buildAdminOrderQueueWhere("store_1", {}), {
      storeId: "store_1",
    });
  });

  it("ANDs status and source with storeId", () => {
    assert.deepEqual(
      buildAdminOrderQueueWhere("store_1", {
        status: "PENDING",
        source: "DIRECT",
      }),
      {
        storeId: "store_1",
        status: "PENDING",
        source: "DIRECT",
      },
    );
  });

  it("applies q as OR between code and customerName", () => {
    const where = buildAdminOrderQueueWhere("store_1", {
      status: "PENDING",
      q: "abc",
    });
    assert.equal(where.storeId, "store_1");
    assert.equal(where.status, "PENDING");
    assert.deepEqual(where.OR, [
      { code: { contains: "abc", mode: "insensitive" } },
      { customerName: { contains: "abc", mode: "insensitive" } },
    ]);
  });
});
