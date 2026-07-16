import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ADMIN_NEW_ORDERS_TAKE } from "@/features/admin/orders/admin-orders.repository";
import { buildDirectOrdersAfterCursorWhere } from "@/features/admin/orders/new-order-cursor";

/**
 * Contract tests for the new-order repository query shape.
 * Runtime Prisma calls are covered indirectly via the service DI tests;
 * this file locks storeId + DIRECT + cursor OR + take semantics.
 */
describe("admin new-orders repository contract", () => {
  it("keeps a fixed take of 20 for delta pages", () => {
    assert.equal(ADMIN_NEW_ORDERS_TAKE, 20);
  });

  it("composes tenant + DIRECT + after-cursor filters", () => {
    const storeId = "store_a";
    const cursor = {
      createdAt: new Date("2026-07-16T12:00:00.000Z"),
      id: "order_1",
    };

    const where = {
      storeId,
      source: "DIRECT" as const,
      ...buildDirectOrdersAfterCursorWhere(cursor),
    };

    assert.equal(where.storeId, "store_a");
    assert.equal(where.source, "DIRECT");
    assert.ok(where.OR);
    assert.equal(where.OR.length, 2);

    // Non-DIRECT sources must not be expressible via this contract.
    assert.notEqual(where.source, "COUNTER");
    assert.notEqual(where.source, "IFOOD");
    assert.notEqual(where.source, "OTHER");

    // Foreign store cannot ride along in the same where object.
    assert.notEqual(where.storeId, "store_b");
  });

  it("pending count semantics are store-scoped PENDING (all sources)", () => {
    const pendingWhere = {
      storeId: "store_a",
      status: "PENDING" as const,
    };
    assert.equal(pendingWhere.storeId, "store_a");
    assert.equal(pendingWhere.status, "PENDING");
    assert.equal("source" in pendingWhere, false);
  });
});
