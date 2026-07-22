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
    payments: [],
    ...overrides,
  };
}

const baseContext = {
  storeId: "store_1",
  role: "OPERATOR" as const,
  userId: "user_1",
};

describe("finalizeCounterOrder", () => {
  it("finalizes legacy single cash exact and writes payments", async () => {
    const writes: Array<Record<string, unknown>> = [];
    const paidAt = new Date("2026-07-15T22:00:00.000Z");

    const result = await finalizeCounterOrder(
      baseContext,
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
    assert.equal(result.payments.length, 1);
    assert.equal(result.payments[0]?.changeCents, 0);
    assert.equal(writes.length, 1);
    assert.equal(writes[0]?.createdByUserId, "user_1");
    assert.equal(writes[0]?.storeId, "store_1");
    assert.deepEqual(writes[0]?.payments, [
      {
        method: "CASH",
        amountCents: 4200,
        tenderedCents: null,
        changeCents: 0,
      },
    ]);
  });

  it("finalizes payments[] mix with cash tender semantics", async () => {
    const writes: Array<Record<string, unknown>> = [];
    const result = await finalizeCounterOrder(
      { ...baseContext, role: "STORE_OWNER" },
      {
        orderId: "order_1",
        payments: [
          { method: "CASH", amountCents: 2000, tenderedCents: 5000 },
          { method: "PIX", amountCents: 2200 },
        ],
      },
      {
        findOrderForCounterFinalize: async () => readyCounterOrder(),
        finalizeCounterOrderPayment: async (input) => {
          writes.push(input);
          return { updated: true };
        },
        now: () => new Date("2026-07-15T22:00:00.000Z"),
        recordOrderLifecycleFunnelEvent: noopFunnel,
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.paymentMethod, null);
    assert.equal(result.changeForCents, null);
    assert.deepEqual(result.payments, [
      {
        method: "CASH",
        amountCents: 2000,
        tenderedCents: 5000,
        changeCents: 3000,
      },
      {
        method: "PIX",
        amountCents: 2200,
        tenderedCents: null,
        changeCents: null,
      },
    ]);
    assert.equal(writes[0]?.paymentMethod, null);
  });

  it("rejects duplicate methods and wrong sums", async () => {
    const dup = await finalizeCounterOrder(
      baseContext,
      {
        orderId: "order_1",
        payments: [
          { method: "PIX", amountCents: 2100 },
          { method: "PIX", amountCents: 2100 },
        ],
      },
      {
        findOrderForCounterFinalize: async () => readyCounterOrder(),
        finalizeCounterOrderPayment: async () => {
          throw new Error("should not write");
        },
        now: () => new Date(),
      },
    );
    assert.equal(dup.ok, false);

    const sum = await finalizeCounterOrder(
      baseContext,
      {
        orderId: "order_1",
        payments: [{ method: "PIX", amountCents: 1000 }],
      },
      {
        findOrderForCounterFinalize: async () => readyCounterOrder(),
        finalizeCounterOrderPayment: async () => {
          throw new Error("should not write");
        },
        now: () => new Date(),
      },
    );
    assert.equal(sum.ok, false);
    if (sum.ok) return;
    assert.match(sum.message, /igual ao total/i);
  });

  it("returns success when replay matches persisted payments", async () => {
    const paidAt = new Date("2026-07-15T22:00:00.000Z");
    const result = await finalizeCounterOrder(
      baseContext,
      { orderId: "order_1", paymentMethod: "PIX" },
      {
        findOrderForCounterFinalize: async () =>
          readyCounterOrder({
            status: "COMPLETED",
            paidAt,
            paymentMethod: "PIX",
            payments: [
              {
                method: "PIX",
                amountCents: 4200,
                tenderedCents: null,
                changeCents: null,
              },
            ],
          }),
        finalizeCounterOrderPayment: async () => {
          throw new Error("should not write");
        },
        now: () => new Date(),
      },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.paymentMethod, "PIX");
    assert.equal(result.paidAt, paidAt.toISOString());
  });

  it("conflicts when already finalized with different composition", async () => {
    const result = await finalizeCounterOrder(
      baseContext,
      { orderId: "order_1", paymentMethod: "CASH" },
      {
        findOrderForCounterFinalize: async () =>
          readyCounterOrder({
            status: "COMPLETED",
            paidAt: new Date(),
            paymentMethod: "PIX",
            payments: [
              {
                method: "PIX",
                amountCents: 4200,
                tenderedCents: null,
                changeCents: null,
              },
            ],
          }),
        finalizeCounterOrderPayment: async () => {
          throw new Error("should not write");
        },
        now: () => new Date(),
      },
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /outro pagamento/i);
  });

  it("treats concurrent update as matching or conflicting replay", async () => {
    let calls = 0;
    const match = await finalizeCounterOrder(
      baseContext,
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
            payments: [
              {
                method: "PIX",
                amountCents: 4200,
                tenderedCents: null,
                changeCents: null,
              },
            ],
          });
        },
        finalizeCounterOrderPayment: async () => ({ updated: false }),
        now: () => new Date("2026-07-15T22:00:00.000Z"),
      },
    );
    assert.equal(match.ok, true);

    let conflictCalls = 0;
    const conflict = await finalizeCounterOrder(
      baseContext,
      { orderId: "order_1", paymentMethod: "CASH" },
      {
        findOrderForCounterFinalize: async () => {
          conflictCalls += 1;
          if (conflictCalls === 1) {
            return readyCounterOrder();
          }
          return readyCounterOrder({
            status: "COMPLETED",
            paidAt: new Date("2026-07-15T22:00:00.000Z"),
            paymentMethod: "PIX",
            payments: [
              {
                method: "PIX",
                amountCents: 4200,
                tenderedCents: null,
                changeCents: null,
              },
            ],
          });
        },
        finalizeCounterOrderPayment: async () => ({ updated: false }),
        now: () => new Date("2026-07-15T22:00:00.000Z"),
      },
    );
    assert.equal(conflict.ok, false);
    if (conflict.ok) return;
    assert.match(conflict.message, /outro pagamento/i);
  });

  it("rejects DIRECT, other tenant, PENDING, CANCELLED and kitchen", async () => {
    const cases: Array<{
      order: CounterFinalizeOrderRecord | null;
      message: RegExp;
    }> = [
      {
        order: readyCounterOrder({ source: "DIRECT", paymentMethod: "PIX" }),
        message: /balcão/i,
      },
      { order: null, message: /não encontrado/i },
      {
        order: readyCounterOrder({ status: "PENDING" }),
        message: /ainda não está pronto/i,
      },
      {
        order: readyCounterOrder({ status: "CANCELLED" }),
        message: /cancelado/i,
      },
    ];

    for (const testCase of cases) {
      const result = await finalizeCounterOrder(
        baseContext,
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

    const kitchen = await finalizeCounterOrder(
      { storeId: "store_1", role: "KITCHEN", userId: "user_1" },
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
  });

  it("emits order_completed funnel event after successful finalize", async () => {
    const funnelCalls: Array<Record<string, unknown>> = [];
    const result = await finalizeCounterOrder(
      baseContext,
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

  it("ignores client trust fields and uses session storeId", async () => {
    let wroteStoreId: string | null = null;
    const result = await finalizeCounterOrder(
      baseContext,
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
          return { updated: true };
        },
        now: () => new Date("2026-07-15T22:00:00.000Z"),
        recordOrderLifecycleFunnelEvent: noopFunnel,
      },
    );
    // legacy+extra keys rejected by strict parse
    assert.equal(result.ok, false);
    assert.equal(wroteStoreId, null);

    const clean = await finalizeCounterOrder(
      baseContext,
      { orderId: "order_1", paymentMethod: "PIX" },
      {
        findOrderForCounterFinalize: async (_id, storeId) => {
          wroteStoreId = storeId;
          return readyCounterOrder();
        },
        finalizeCounterOrderPayment: async (input) => {
          assert.equal(input.storeId, "store_1");
          return { updated: true };
        },
        now: () => new Date("2026-07-15T22:00:00.000Z"),
        recordOrderLifecycleFunnelEvent: noopFunnel,
      },
    );
    assert.equal(clean.ok, true);
    assert.equal(wroteStoreId, "store_1");
  });
});
