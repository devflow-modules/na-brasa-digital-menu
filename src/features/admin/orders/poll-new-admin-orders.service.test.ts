import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminNewOrderRow } from "@/features/admin/orders/admin-orders.repository";
import { ADMIN_NEW_ORDERS_TAKE } from "@/features/admin/orders/admin-orders.repository";
import { buildDirectOrdersAfterCursorWhere } from "@/features/admin/orders/new-order-cursor";
import { pollNewAdminOrders } from "@/features/admin/orders/poll-new-admin-orders.service";

function directRow(
  overrides: Partial<AdminNewOrderRow> & Pick<AdminNewOrderRow, "id">,
): AdminNewOrderRow {
  return {
    code: `NB-${overrides.id}`,
    source: "DIRECT",
    status: "PENDING",
    customerName: "Cliente",
    totalCents: 2500,
    createdAt: new Date("2026-07-16T12:00:00.000Z"),
    ...overrides,
  };
}

const SENSITIVE_KEYS = [
  "customerPhone",
  "deliveryAddress",
  "whatsappMessage",
  "items",
  "addons",
  "paymentMethod",
  "paidAt",
  "createdByUserId",
  "storeId",
] as const;

function assertNoSensitiveFields(value: unknown) {
  const json = JSON.stringify(value);
  for (const key of SENSITIVE_KEYS) {
    assert.equal(json.includes(`"${key}"`), false, `leaked ${key}`);
  }
}

describe("pollNewAdminOrders", () => {
  it("bootstraps cursor from latest DIRECT without alert orders", async () => {
    const tip = {
      id: "order_tip",
      createdAt: new Date("2026-07-16T15:00:00.000Z"),
    };
    let listed = false;

    const result = await pollNewAdminOrders(
      "store_a",
      {},
      {
        findLatestDirectOrderCursor: async (storeId) => {
          assert.equal(storeId, "store_a");
          return tip;
        },
        listDirectOrdersAfterCursor: async () => {
          listed = true;
          return [];
        },
        countPendingOrdersForStore: async (storeId) => {
          assert.equal(storeId, "store_a");
          return 3;
        },
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.mode, "bootstrap");
    assert.deepEqual(result.orders, []);
    assert.equal(result.hasMore, false);
    assert.equal(result.pendingCount, 3);
    assert.deepEqual(result.cursor, {
      createdAt: "2026-07-16T15:00:00.000Z",
      id: "order_tip",
    });
    assert.equal(listed, false);
    assertNoSensitiveFields(result);
  });

  it("bootstraps with null cursor when store has no DIRECT orders", async () => {
    const result = await pollNewAdminOrders(
      "store_a",
      {},
      {
        findLatestDirectOrderCursor: async () => null,
        listDirectOrdersAfterCursor: async () => [],
        countPendingOrdersForStore: async () => 0,
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.cursor, null);
    assert.deepEqual(result.orders, []);
  });

  it("rejects partial or invalid cursors", async () => {
    const deps = {
      findLatestDirectOrderCursor: async () => null,
      listDirectOrdersAfterCursor: async () => [],
      countPendingOrdersForStore: async () => 0,
    };

    for (const input of [
      { afterCreatedAt: "2026-07-16T12:00:00.000Z" },
      { afterId: "order_1" },
      { afterCreatedAt: "nope", afterId: "order_1" },
      { afterCreatedAt: "2026-07-16T12:00:00.000Z", afterId: "" },
    ]) {
      const result = await pollNewAdminOrders("store_a", input, deps);
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.code, "INVALID_CURSOR");
    }
  });

  it("delta returns DIRECT orders after cursor with ISO dates", async () => {
    const cursor = {
      createdAt: new Date("2026-07-16T12:00:00.000Z"),
      id: "order_1",
    };
    const calls: Array<{
      storeId: string;
      cursor: { createdAt: Date; id: string };
      take: number;
    }> = [];

    const result = await pollNewAdminOrders(
      "store_a",
      {
        afterCreatedAt: "2026-07-16T12:00:00.000Z",
        afterId: "order_1",
      },
      {
        findLatestDirectOrderCursor: async () => cursor,
        listDirectOrdersAfterCursor: async (storeId, c, take) => {
          calls.push({ storeId, cursor: c, take });
          return [
            directRow({
              id: "order_2",
              createdAt: new Date("2026-07-16T12:00:01.000Z"),
              customerName: "Ana",
              totalCents: 4200,
            }),
          ];
        },
        countPendingOrdersForStore: async () => 1,
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.mode, "delta");
    assert.equal(result.hasMore, false);
    assert.equal(result.orders.length, 1);
    assert.equal(result.orders[0]?.id, "order_2");
    assert.equal(result.orders[0]?.source, "DIRECT");
    assert.equal(result.orders[0]?.createdAt, "2026-07-16T12:00:01.000Z");
    assert.deepEqual(result.cursor, {
      createdAt: "2026-07-16T12:00:01.000Z",
      id: "order_2",
    });
    assert.equal(calls[0]?.storeId, "store_a");
    assert.equal(calls[0]?.take, ADMIN_NEW_ORDERS_TAKE + 1);
    assert.deepEqual(
      buildDirectOrdersAfterCursorWhere(calls[0]!.cursor),
      buildDirectOrdersAfterCursorWhere(cursor),
    );
    assertNoSensitiveFields(result);
  });

  it("handles timestamp ties by id order across pages", async () => {
    const sameTime = new Date("2026-07-16T12:00:00.000Z");
    let page = 0;

    const deps = {
      findLatestDirectOrderCursor: async () => null,
      listDirectOrdersAfterCursor: async (
        _storeId: string,
        cursor: { createdAt: Date; id: string },
      ) => {
        page += 1;
        if (page === 1) {
          assert.equal(cursor.id, "id_a");
          return [directRow({ id: "id_b", createdAt: sameTime })];
        }
        assert.equal(cursor.id, "id_b");
        return [directRow({ id: "id_c", createdAt: sameTime })];
      },
      countPendingOrdersForStore: async () => 2,
    };

    const first = await pollNewAdminOrders(
      "store_a",
      {
        afterCreatedAt: sameTime.toISOString(),
        afterId: "id_a",
      },
      deps,
    );
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.orders[0]?.id, "id_b");
    assert.equal(first.cursor?.id, "id_b");

    const second = await pollNewAdminOrders(
      "store_a",
      {
        afterCreatedAt: first.cursor!.createdAt,
        afterId: first.cursor!.id,
      },
      deps,
    );
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.orders[0]?.id, "id_c");
    assert.notEqual(second.orders[0]?.id, first.orders[0]?.id);
  });

  it("pages more than TAKE without losing or repeating orders", async () => {
    const base = new Date("2026-07-16T12:00:00.000Z").getTime();
    const all = Array.from({ length: 25 }, (_, index) =>
      directRow({
        id: `order_${String(index + 1).padStart(2, "0")}`,
        createdAt: new Date(base + index * 1000),
      }),
    );

    const listed: string[] = [];

    const deps = {
      findLatestDirectOrderCursor: async () => null,
      listDirectOrdersAfterCursor: async (
        storeId: string,
        cursor: { createdAt: Date; id: string },
        take: number,
      ) => {
        assert.equal(storeId, "store_a");
        const after = all.filter((order) => {
          if (order.createdAt.getTime() > cursor.createdAt.getTime()) {
            return true;
          }
          return (
            order.createdAt.getTime() === cursor.createdAt.getTime() &&
            order.id > cursor.id
          );
        });
        return after.slice(0, take);
      },
      countPendingOrdersForStore: async () => 25,
    };

    const first = await pollNewAdminOrders(
      "store_a",
      {
        afterCreatedAt: new Date(base - 1000).toISOString(),
        afterId: "order_00",
      },
      deps,
    );
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.orders.length, ADMIN_NEW_ORDERS_TAKE);
    assert.equal(first.hasMore, true);
    assert.equal(first.cursor?.id, "order_20");
    listed.push(...first.orders.map((o) => o.id));

    const second = await pollNewAdminOrders(
      "store_a",
      {
        afterCreatedAt: first.cursor!.createdAt,
        afterId: first.cursor!.id,
      },
      deps,
    );
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.hasMore, false);
    assert.equal(second.orders.length, 5);
    listed.push(...second.orders.map((o) => o.id));

    assert.deepEqual(
      listed,
      all.map((o) => o.id),
    );
    assert.equal(new Set(listed).size, 25);
  });

  it("scopes pendingCount and list calls to the authenticated store only", async () => {
    const storeIds: string[] = [];

    await pollNewAdminOrders(
      "store_a",
      {
        afterCreatedAt: "2026-07-16T12:00:00.000Z",
        afterId: "x",
      },
      {
        findLatestDirectOrderCursor: async (storeId) => {
          storeIds.push(storeId);
          return null;
        },
        listDirectOrdersAfterCursor: async (storeId) => {
          storeIds.push(storeId);
          return [];
        },
        countPendingOrdersForStore: async (storeId) => {
          storeIds.push(storeId);
          return 9;
        },
      },
    );

    assert.ok(storeIds.length > 0);
    assert.deepEqual(
      [...new Set(storeIds)],
      ["store_a"],
    );
  });

  it("keeps cursor when delta page is empty", async () => {
    const result = await pollNewAdminOrders(
      "store_a",
      {
        afterCreatedAt: "2026-07-16T12:00:00.000Z",
        afterId: "order_1",
      },
      {
        findLatestDirectOrderCursor: async () => null,
        listDirectOrdersAfterCursor: async () => [],
        countPendingOrdersForStore: async () => 0,
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.cursor, {
      createdAt: "2026-07-16T12:00:00.000Z",
      id: "order_1",
    });
    assert.deepEqual(result.orders, []);
  });
});
