import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CounterFinalizeOrderRecord } from "@/features/admin/orders/admin-orders.repository";
import { finalizeCounterOrder } from "@/features/orders/services/finalize-counter-order.service";

const noopFunnel = async () =>
  ({ ok: true as const, recorded: true as const });

function readyCounterOrder(
  overrides: Partial<CounterFinalizeOrderRecord> = {},
): CounterFinalizeOrderRecord {
  return {
    id: "order_1",
    storeId: "store_1",
    source: "COUNTER",
    status: "READY",
    deliveryType: "PICKUP",
    paymentMethod: null,
    changeForCents: null,
    paidAt: null,
    totalCents: 4200,
    ...overrides,
  };
}

describe("finalizeCounterOrder", () => {
  it("finalizes eligible COUNTER with cash exact payment", async () => {
    const writes: Array<Record<string, unknown>> = [];
    const paidAt = new Date("2026-07-15T22:00:00.000Z");

    const result = await finalizeCounterOrder(
      { storeId: "store_1", role: "OPERATOR" },
      { orderId: "order_1", paymentMethod: "CASH" },
      {
        findOrderForCounterFinalize: async (orderId, storeId) => {
          assert.equal(orderId, "order_1");
          assert.equal(storeId, "store_1");
          return readyCounterOrder();
        },
        finalizeCounterOrderPayment: async (input) => {
          writes.push(input);
          return { updated: true };
        },
        now: () => paidAt,
        recordOrderLifecycleFunnelEvent: noopFunnel,
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.status, "COMPLETED");
    assert.equal(result.paymentMethod, "CASH");
    assert.equal(result.changeForCents, null);
    assert.equal(result.paidAt, paidAt.toISOString());
    assert.equal(writes.length, 1);
    assert.equal(writes[0]?.changeForCents, null);
    assert.equal(writes[0]?.paymentMethod, "CASH");
    assert.equal(writes[0]?.paidAt, paidAt);
  });

  it("emits order_completed funnel event after successful finalize", async () => {
    const funnelCalls: Array<Record<string, unknown>> = [];
    const result = await finalizeCounterOrder(
      { storeId: "store_1", role: "OPERATOR" },
      { orderId: "order_1", paymentMethod: "PIX" },
      {
        findOrderForCounterFinalize: async () => readyCounterOrder(),
        finalizeCounterOrderPayment: async () => ({ updated: true }),
        now: () => new Date("2026-07-15T22:00:00.000Z"),
        recordOrderLifecycleFunnelEvent: async (input) => {
          funnelCalls.push(input);
          return { ok: true, recorded: true };
        },
      },
    );

    assert.equal(result.ok, true);
    assert.deepEqual(funnelCalls, [
      {
        storeId: "store_1",
        orderId: "order_1",
        source: "COUNTER",
        name: "order_completed",
      },
    ]);
  });

  it("persists tendered cash amount and accepts card/pix without change", async () => {
    const cashWrites: Array<Record<string, unknown>> = [];
    const result = await finalizeCounterOrder(
      { storeId: "store_1", role: "STORE_OWNER" },
      {
        orderId: "order_1",
        paymentMethod: "CASH",
        changeForCents: 5000,
      },
      {
        findOrderForCounterFinalize: async () => readyCounterOrder(),
        finalizeCounterOrderPayment: async (input) => {
          cashWrites.push(input);
          return { updated: true };
        },
        now: () => new Date("2026-07-15T22:00:00.000Z"),
        recordOrderLifecycleFunnelEvent: noopFunnel,
      },
    );
    assert.equal(result.ok, true);
    assert.equal(cashWrites[0]?.changeForCents, 5000);

    const pix = await finalizeCounterOrder(
      { storeId: "store_1", role: "MANAGER" },
      { orderId: "order_1", paymentMethod: "PIX" },
      {
        findOrderForCounterFinalize: async () => readyCounterOrder(),
        finalizeCounterOrderPayment: async (input) => {
          assert.equal(input.changeForCents, null);
          return { updated: true };
        },
        now: () => new Date("2026-07-15T22:00:00.000Z"),
        recordOrderLifecycleFunnelEvent: noopFunnel,
      },
    );
    assert.equal(pix.ok, true);

    const card = await finalizeCounterOrder(
      { storeId: "store_1", role: "MASTER" },
      { orderId: "order_1", paymentMethod: "DEBIT_CARD" },
      {
        findOrderForCounterFinalize: async () => readyCounterOrder(),
        finalizeCounterOrderPayment: async (input) => {
          assert.equal(input.changeForCents, null);
          return { updated: true };
        },
        now: () => new Date("2026-07-15T22:00:00.000Z"),
        recordOrderLifecycleFunnelEvent: noopFunnel,
      },
    );
    assert.equal(card.ok, true);
  });

  it("rejects insufficient cash tender", async () => {
    const result = await finalizeCounterOrder(
      { storeId: "store_1", role: "OPERATOR" },
      {
        orderId: "order_1",
        paymentMethod: "CASH",
        changeForCents: 4000,
      },
      {
        findOrderForCounterFinalize: async () => readyCounterOrder(),
        finalizeCounterOrderPayment: async () => {
          throw new Error("should not write");
        },
        now: () => new Date(),
      },
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /igual ou maior/i);
  });

  it("rejects DIRECT, other tenant, PENDING, CANCELLED and already paid", async () => {
    const cases: Array<{
      order: CounterFinalizeOrderRecord | null;
      message: RegExp;
    }> = [
      {
        order: readyCounterOrder({ source: "DIRECT", paymentMethod: "PIX" }),
        message: /balcão/i,
      },
      {
        order: null,
        message: /não encontrado/i,
      },
      {
        order: readyCounterOrder({ status: "PENDING" }),
        message: /ainda não está pronto/i,
      },
      {
        order: readyCounterOrder({ status: "CANCELLED" }),
        message: /cancelado/i,
      },
      {
        order: readyCounterOrder({
          status: "COMPLETED",
          paidAt: new Date(),
          paymentMethod: "PIX",
        }),
        message: /já foi finalizado/i,
      },
      {
        order: readyCounterOrder({
          status: "READY",
          paidAt: new Date(),
          paymentMethod: "PIX",
        }),
        message: /já foi finalizado/i,
      },
    ];

    for (const testCase of cases) {
      const result = await finalizeCounterOrder(
        { storeId: "store_1", role: "OPERATOR" },
        { orderId: "order_1", paymentMethod: "PIX" },
        {
          findOrderForCounterFinalize: async () => testCase.order,
          finalizeCounterOrderPayment: async () => {
            throw new Error("should not write");
          },
          now: () => new Date(),
        },
      );
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.match(result.message, testCase.message);
    }
  });

  it("blocks kitchen and ignores client trust fields", async () => {
    const kitchen = await finalizeCounterOrder(
      { storeId: "store_1", role: "KITCHEN" },
      { orderId: "order_1", paymentMethod: "PIX" },
      {
        findOrderForCounterFinalize: async () => readyCounterOrder(),
        finalizeCounterOrderPayment: async () => {
          throw new Error("should not write");
        },
        now: () => new Date(),
      },
    );
    assert.equal(kitchen.ok, false);

    let wroteStoreId: string | null = null;
    const result = await finalizeCounterOrder(
      { storeId: "store_1", role: "OPERATOR" },
      {
        orderId: "order_1",
        paymentMethod: "PIX",
        storeId: "evil_store",
        paidAt: "2020-01-01T00:00:00.000Z",
        status: "COMPLETED",
        totalCents: 1,
      },
      {
        findOrderForCounterFinalize: async (_id, storeId) => {
          wroteStoreId = storeId;
          return readyCounterOrder();
        },
        finalizeCounterOrderPayment: async (input) => {
          assert.equal(input.storeId, "store_1");
          assert.equal(
            input.paidAt.toISOString(),
            "2026-07-15T22:00:00.000Z",
          );
          return { updated: true };
        },
        now: () => new Date("2026-07-15T22:00:00.000Z"),
        recordOrderLifecycleFunnelEvent: noopFunnel,
      },
    );
    assert.equal(result.ok, true);
    assert.equal(wroteStoreId, "store_1");
  });

  it("handles concurrent update as already finalized", async () => {
    let calls = 0;
    const result = await finalizeCounterOrder(
      { storeId: "store_1", role: "OPERATOR" },
      { orderId: "order_1", paymentMethod: "PIX" },
      {
        findOrderForCounterFinalize: async () => {
          calls += 1;
          if (calls === 1) {
            return readyCounterOrder();
          }
          return readyCounterOrder({
            status: "COMPLETED",
            paidAt: new Date("2026-07-15T22:00:00.000Z"),
            paymentMethod: "PIX",
          });
        },
        finalizeCounterOrderPayment: async () => ({ updated: false }),
        now: () => new Date("2026-07-15T22:00:00.000Z"),
      },
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /já foi finalizado/i);
  });
});
