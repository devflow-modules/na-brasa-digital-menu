import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { pollNewAdminOrdersAction } from "@/features/admin/orders/actions/poll-new-admin-orders-action";
import type { PollNewAdminOrdersResult } from "@/features/admin/orders/poll-new-admin-orders.service";

function context(role: AdminStoreContext["role"]): AdminStoreContext {
  return {
    session: {
      userId: "user_1",
      name: "Operador",
      email: "ops@example.com",
      role,
      storeId: role === "MASTER" ? null : "store_a",
      iat: 1,
      exp: 2,
    },
    storeId: "store_a",
    storeSlug: "na-brasa",
    storeName: "Na Braza",
    role,
  };
}

describe("pollNewAdminOrdersAction", () => {
  it("returns UNAUTHORIZED without session/store context", async () => {
    const result = await pollNewAdminOrdersAction(
      {},
      {
        getAdminStoreContextOrNull: async () => null,
        pollNewAdminOrders: async () => {
          throw new Error("should not run");
        },
      },
    );

    assert.deepEqual(result, { ok: false, code: "UNAUTHORIZED" });
  });

  it("allows KITCHEN when orders.read is present", async () => {
    let calledStoreId: string | null = null;

    const result = await pollNewAdminOrdersAction(
      {},
      {
        getAdminStoreContextOrNull: async () => context("KITCHEN"),
        pollNewAdminOrders: async (storeId) => {
          calledStoreId = storeId;
          return {
            ok: true,
            mode: "bootstrap",
            cursor: null,
            orders: [],
            pendingCount: 0,
            hasMore: false,
          } satisfies PollNewAdminOrdersResult;
        },
      },
    );

    assert.equal(result.ok, true);
    assert.equal(calledStoreId, "store_a");
  });

  it("returns FORBIDDEN when role lacks orders.read", async () => {
    const result = await pollNewAdminOrdersAction(
      {},
      {
        getAdminStoreContextOrNull: async () => ({
          ...context("OPERATOR"),
          // Defensive path: current matrix grants orders.read to all admin roles.
          role: "NO_ORDERS_READ" as AdminStoreContext["role"],
        }),
        pollNewAdminOrders: async () => {
          throw new Error("should not run");
        },
      },
    );

    assert.deepEqual(result, { ok: false, code: "FORBIDDEN" });
  });

  it("maps INVALID_CURSOR from the service", async () => {
    const result = await pollNewAdminOrdersAction(
      { afterId: "only-id" },
      {
        getAdminStoreContextOrNull: async () => context("OPERATOR"),
        pollNewAdminOrders: async () => ({
          ok: false,
          code: "INVALID_CURSOR",
        }),
      },
    );

    assert.deepEqual(result, { ok: false, code: "INVALID_CURSOR" });
  });

  it("returns bootstrap payload with serialized fields only", async () => {
    const result = await pollNewAdminOrdersAction(
      {},
      {
        getAdminStoreContextOrNull: async () => context("STORE_OWNER"),
        pollNewAdminOrders: async () => ({
          ok: true,
          mode: "bootstrap",
          cursor: {
            createdAt: "2026-07-16T12:00:00.000Z",
            id: "order_1",
          },
          orders: [],
          pendingCount: 2,
          hasMore: false,
        }),
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.mode, "bootstrap");
    assert.equal(result.pendingCount, 2);
    const json = JSON.stringify(result);
    for (const key of [
      "customerPhone",
      "deliveryAddress",
      "whatsappMessage",
      "items",
      "addons",
      "paymentMethod",
      "paidAt",
      "createdByUserId",
      "storeId",
    ]) {
      assert.equal(json.includes(`"${key}"`), false, `leaked ${key}`);
    }
  });

  it("maps unexpected errors safely", async () => {
    const result = await pollNewAdminOrdersAction(
      {},
      {
        getAdminStoreContextOrNull: async () => context("MANAGER"),
        pollNewAdminOrders: async () => {
          throw new Error("db down");
        },
      },
    );

    assert.deepEqual(result, { ok: false, code: "UNEXPECTED_ERROR" });
  });

  it("does not accept storeId from client input (uses context store)", async () => {
    let usedStoreId: string | null = null;

    await pollNewAdminOrdersAction(
      { storeId: "store_b", afterCreatedAt: "x", afterId: "y" },
      {
        getAdminStoreContextOrNull: async () => context("OPERATOR"),
        pollNewAdminOrders: async (storeId, input) => {
          usedStoreId = storeId;
          assert.equal(
            typeof input === "object" &&
              input !== null &&
              "storeId" in input &&
              (input as { storeId: string }).storeId === "store_b",
            true,
          );
          return { ok: false, code: "INVALID_CURSOR" };
        },
      },
    );

    assert.equal(usedStoreId, "store_a");
  });
});
