import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import type { DirectOrderIdempotencyRecord } from "@/features/orders/services/resolve-direct-order-idempotency";
import {
  ORDER_IDEMPOTENCY_CONFLICT_MESSAGE,
} from "@/features/orders/utils/order-idempotency";
import type { OrderStoreRecord } from "@/features/orders/repositories/orders.repository";
import {
  createOrder,
  type CreateOrderDeps,
} from "@/features/orders/services/create-order.service";
import type {
  CreateOrderInput,
  CreateOrderPersistenceInput,
  PreparedOrderItem,
} from "@/features/orders/types";

const MINIMUM_CENTS = 5_000;

function baseStore(
  overrides: Partial<OrderStoreRecord> = {},
): OrderStoreRecord {
  return {
    id: "store_1",
    name: "Na Braza",
    slug: "na-brasa",
    whatsapp: "5511999999999",
    isOpen: true,
    pickupEnabled: true,
    deliveryEnabled: true,
    deliveryFeeCents: 600,
    minimumOrderAmountCents: MINIMUM_CENTS,
    ...overrides,
  };
}

function pricedItem(subtotalCents: number): PreparedOrderItem {
  return {
    productId: "p1",
    productNameSnapshot: "Coca-Cola",
    productDescriptionSnapshot: null,
    quantity: 1,
    unitPriceCents: subtotalCents,
    totalCents: subtotalCents,
    notes: null,
    addons: [],
  };
}

function validInput(
  overrides: Partial<CreateOrderInput> = {},
): CreateOrderInput {
  return {
    storeSlug: "na-brasa",
    customerName: "Cliente Teste",
    customerPhone: "11999999999",
    deliveryType: "PICKUP",
    paymentMethod: "PIX",
    items: [{ productId: "p1", quantity: 1, addonIds: [] }],
    idempotencyKey: randomUUID(),
    ...overrides,
  };
}

function mockDeps(options: {
  store?: OrderStoreRecord | null;
  subtotalCents: number;
  items?: PreparedOrderItem[];
  captured?: CreateOrderPersistenceInput[];
  existingIdempotency?: DirectOrderIdempotencyRecord | null;
  createThrows?: unknown;
  findCalls?: number[];
}): CreateOrderDeps {
  const captured = options.captured ?? [];
  const items = options.items ?? [pricedItem(options.subtotalCents)];
  let createCallCount = 0;

  return {
    findStoreForOrderBySlug: async () => options.store ?? null,
    findDirectOrderByIdempotencyKey: async () => {
      if (options.findCalls) {
        options.findCalls.push(createCallCount);
      }
      return options.existingIdempotency ?? null;
    },
    getOrderIdempotencySecret: () => "test-idempotency-secret-min-16",
    resolveAndPriceOrderItems: async () => ({
      ok: true as const,
      subtotalCents: options.subtotalCents,
      items,
    }),
    createOrderWithItems: async (input: CreateOrderPersistenceInput) => {
      createCallCount += 1;
      if (options.createThrows) {
        throw options.createThrows;
      }
      captured.push(input);
      return { id: "order_1", code: "NB-123456-100" };
    },
    generateOrderCode: () => "NB-123456-100",
    recordOrderLifecycleFunnelEvent: async () => ({
      ok: true as const,
      recorded: true as const,
    }),
  };
}

describe("createOrder delivery minimum", () => {
  it("rejects DIRECT DELIVERY below minimum", async () => {
    const result = await createOrder(
      validInput({
        deliveryType: "DELIVERY",
        deliveryAddress: "Rua Teste, 100",
      }),
      mockDeps({ store: baseStore(), subtotalCents: MINIMUM_CENTS - 100 }),
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /valor mínimo para entrega/i);
  });

  it("creates DIRECT DELIVERY exactly at minimum", async () => {
    const captured: CreateOrderPersistenceInput[] = [];
    const result = await createOrder(
      validInput({
        deliveryType: "DELIVERY",
        deliveryAddress: "Rua Teste, 100",
      }),
      mockDeps({
        store: baseStore(),
        subtotalCents: MINIMUM_CENTS,
        captured,
      }),
    );

    assert.equal(result.ok, true);
    assert.equal(captured[0]?.deliveryType, "DELIVERY");
    assert.equal(captured[0]?.subtotalCents, MINIMUM_CENTS);
    assert.equal(captured[0]?.source, "DIRECT");
  });

  it("creates DIRECT DELIVERY above minimum", async () => {
    const result = await createOrder(
      validInput({
        deliveryType: "DELIVERY",
        deliveryAddress: "Rua Teste, 100",
      }),
      mockDeps({ store: baseStore(), subtotalCents: MINIMUM_CENTS + 500 }),
    );

    assert.equal(result.ok, true);
  });

  it("creates DIRECT PICKUP below minimum", async () => {
    const captured: CreateOrderPersistenceInput[] = [];
    const result = await createOrder(
      validInput({ deliveryType: "PICKUP" }),
      mockDeps({
        store: baseStore(),
        subtotalCents: 700,
        captured,
      }),
    );

    assert.equal(result.ok, true);
    assert.equal(captured[0]?.deliveryType, "PICKUP");
    assert.equal(captured[0]?.subtotalCents, 700);
    assert.equal(captured[0]?.deliveryFeeCents, 0);
    assert.equal(captured[0]?.source, "DIRECT");
  });

  it("creates DIRECT PICKUP at and above minimum", async () => {
    const atMin = await createOrder(
      validInput({ deliveryType: "PICKUP" }),
      mockDeps({ store: baseStore(), subtotalCents: MINIMUM_CENTS }),
    );
    assert.equal(atMin.ok, true);

    const above = await createOrder(
      validInput({ deliveryType: "PICKUP" }),
      mockDeps({ store: baseStore(), subtotalCents: MINIMUM_CENTS + 1 }),
    );
    assert.equal(above.ok, true);
  });

  it("skips minimum when store minimum is zero", async () => {
    const result = await createOrder(
      validInput({
        deliveryType: "DELIVERY",
        deliveryAddress: "Rua Teste, 100",
      }),
      mockDeps({
        store: baseStore({ minimumOrderAmountCents: 0 }),
        subtotalCents: 100,
      }),
    );

    assert.equal(result.ok, true);
  });

  it("uses the resolved store minimum (tenant-scoped)", async () => {
    const result = await createOrder(
      validInput({
        deliveryType: "DELIVERY",
        deliveryAddress: "Rua Teste, 100",
      }),
      mockDeps({
        store: baseStore({
          id: "store_a",
          minimumOrderAmountCents: 10_000,
        }),
        subtotalCents: 9_999,
      }),
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /valor mínimo para entrega/i);
  });

  it("compares server-priced subtotal including addons", async () => {
    const item = pricedItem(2_000);
    item.addons = [
      {
        addonId: "a1",
        addonNameSnapshot: "Extra",
        addonPriceCents: 500,
      },
    ];
    item.totalCents = 2_500;

    const result = await createOrder(
      validInput({
        deliveryType: "DELIVERY",
        deliveryAddress: "Rua Teste, 100",
        items: [{ productId: "p1", quantity: 1, addonIds: ["a1"] }],
      }),
      mockDeps({
        store: baseStore(),
        subtotalCents: 2_500,
        items: [item],
      }),
    );

    assert.equal(result.ok, false);
  });

  it("rejects PICKUP when pickup is disabled on the store", async () => {
    const result = await createOrder(
      validInput({ deliveryType: "PICKUP" }),
      mockDeps({
        store: baseStore({ pickupEnabled: false }),
        subtotalCents: 100,
      }),
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /retirada indisponível/i);
  });

  it("rejects DELIVERY when delivery is disabled on the store", async () => {
    const result = await createOrder(
      validInput({
        deliveryType: "DELIVERY",
        deliveryAddress: "Rua Teste, 100",
      }),
      mockDeps({
        store: baseStore({ deliveryEnabled: false }),
        subtotalCents: MINIMUM_CENTS,
      }),
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /entrega indisponível/i);
  });

  it("always persists source DIRECT (client cannot forge COUNTER)", async () => {
    const captured: CreateOrderPersistenceInput[] = [];
    const result = await createOrder(
      validInput({ deliveryType: "PICKUP" }),
      mockDeps({ store: baseStore(), subtotalCents: 100, captured }),
    );

    assert.equal(result.ok, true);
    assert.equal(captured[0]?.source, "DIRECT");
  });

  it("emits order_created funnel event after successful DIRECT persist", async () => {
    const funnelCalls: Array<Record<string, unknown>> = [];
    const deps = mockDeps({ store: baseStore(), subtotalCents: 100 });
    deps.recordOrderLifecycleFunnelEvent = async (input) => {
      funnelCalls.push(input);
      return { ok: true, recorded: true };
    };

    const result = await createOrder(
      validInput({ deliveryType: "PICKUP" }),
      deps,
    );

    assert.equal(result.ok, true);
    assert.deepEqual(funnelCalls, [
      {
        storeId: "store_1",
        orderId: "order_1",
        source: "DIRECT",
        name: "order_created",
      },
    ]);
  });

  it("keeps successful create when funnel recording fails", async () => {
    const deps = mockDeps({ store: baseStore(), subtotalCents: 100 });
    deps.recordOrderLifecycleFunnelEvent = async () => {
      throw new Error("funnel down");
    };

    const result = await createOrder(
      validInput({ deliveryType: "PICKUP" }),
      deps,
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.orderId, "order_1");
  });

  it("rejects when store is closed before pricing or persistence", async () => {
    let pricedCalls = 0;
    let createCalls = 0;

    const result = await createOrder(validInput({ deliveryType: "PICKUP" }), {
      findStoreForOrderBySlug: async () => baseStore({ isOpen: false }),
      findDirectOrderByIdempotencyKey: async () => null,
      getOrderIdempotencySecret: () => "test-idempotency-secret-min-16",
      resolveAndPriceOrderItems: async () => {
        pricedCalls += 1;
        return {
          ok: true as const,
          subtotalCents: 1_000,
          items: [pricedItem(1_000)],
        };
      },
      createOrderWithItems: async () => {
        createCalls += 1;
        return { id: "order_x", code: "NB-000000-000" };
      },
      generateOrderCode: () => "NB-000000-000",
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, "A loja está fechada no momento.");
    assert.equal(pricedCalls, 0);
    assert.equal(createCalls, 0);
  });
});

describe("createOrder DIRECT idempotency", () => {
  const idempotencyKey = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

  it("replays existing order without persisting again or emitting order_created", async () => {
    const funnelCalls: Array<Record<string, unknown>> = [];
    const captured: CreateOrderPersistenceInput[] = [];
    const input = validInput({
      deliveryType: "PICKUP",
      idempotencyKey,
    });

    const { computeOrderIdempotencyFingerprint, buildOrderIdempotencyCanonicalPayload } =
      await import("@/features/orders/utils/order-idempotency");
    const fingerprint = computeOrderIdempotencyFingerprint(
      "test-idempotency-secret-min-16",
      buildOrderIdempotencyCanonicalPayload({
        storeId: "store_1",
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        deliveryType: input.deliveryType,
        deliveryAddress: null,
        paymentMethod: input.paymentMethod,
        changeForCents: null,
        notes: null,
        subtotalCents: 100,
        deliveryFeeCents: 0,
        totalCents: 100,
        pricedItems: [pricedItem(100)],
        clientItems: input.items,
      }),
    );

    const replayDeps = mockDeps({
      store: baseStore(),
      subtotalCents: 100,
      captured,
      existingIdempotency: {
        id: "order_existing",
        code: "NB-EXISTING-1",
        idempotencyFingerprint: fingerprint,
        whatsappMessage: "Pedido NB-EXISTING-1",
      },
    });
    replayDeps.recordOrderLifecycleFunnelEvent = async (event) => {
      funnelCalls.push(event);
      return { ok: true, recorded: true };
    };

    const replay = await createOrder(input, replayDeps);

    assert.equal(replay.ok, true);
    if (!replay.ok) return;
    assert.equal(replay.orderId, "order_existing");
    assert.equal(replay.orderCode, "NB-EXISTING-1");
    assert.match(replay.whatsappUrl, /wa\.me|api\.whatsapp\.com/);
    assert.equal(captured.length, 0);
    assert.equal(funnelCalls.length, 0);
  });

  it("returns conflict when key matches but fingerprint differs", async () => {
    const captured: CreateOrderPersistenceInput[] = [];
    const result = await createOrder(
      validInput({ deliveryType: "PICKUP", idempotencyKey }),
      mockDeps({
        store: baseStore(),
        subtotalCents: 100,
        captured,
        existingIdempotency: {
          id: "order_existing",
          code: "NB-EXISTING-1",
          idempotencyFingerprint: "different-fingerprint",
          whatsappMessage: "Pedido",
        },
      }),
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, ORDER_IDEMPOTENCY_CONFLICT_MESSAGE);
    assert.equal(result.code, "IDEMPOTENCY_CONFLICT");
    assert.equal(captured.length, 0);
  });

  it("reloads after idempotency unique race and replays without duplicate funnel", async () => {
    const funnelCalls: Array<Record<string, unknown>> = [];
    const captured: CreateOrderPersistenceInput[] = [];
    let findCount = 0;
    const input = validInput({ deliveryType: "PICKUP", idempotencyKey });

    const { computeOrderIdempotencyFingerprint, buildOrderIdempotencyCanonicalPayload } =
      await import("@/features/orders/utils/order-idempotency");
    const fingerprint = computeOrderIdempotencyFingerprint(
      "test-idempotency-secret-min-16",
      buildOrderIdempotencyCanonicalPayload({
        storeId: "store_1",
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        deliveryType: input.deliveryType,
        deliveryAddress: null,
        paymentMethod: input.paymentMethod,
        changeForCents: null,
        notes: null,
        subtotalCents: 100,
        deliveryFeeCents: 0,
        totalCents: 100,
        pricedItems: [pricedItem(100)],
        clientItems: input.items,
      }),
    );

    const deps: CreateOrderDeps = {
      findStoreForOrderBySlug: async () => baseStore(),
      findDirectOrderByIdempotencyKey: async () => {
        findCount += 1;
        if (findCount >= 2) {
          return {
            id: "order_raced",
            code: "NB-RACED-1",
            idempotencyFingerprint: fingerprint,
            whatsappMessage: "Pedido raced",
          };
        }
        return null;
      },
      getOrderIdempotencySecret: () => "test-idempotency-secret-min-16",
      resolveAndPriceOrderItems: async () => ({
        ok: true as const,
        subtotalCents: 100,
        items: [pricedItem(100)],
      }),
      createOrderWithItems: async () => {
        const err = Object.assign(new Error("Unique"), {
          code: "P2002",
          meta: { target: ["storeId", "idempotencyKey"] },
        });
        throw err;
      },
      generateOrderCode: () => "NB-123456-100",
      recordOrderLifecycleFunnelEvent: async (event) => {
        funnelCalls.push(event);
        return { ok: true, recorded: true };
      },
    };

    const result = await createOrder(input, deps);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.orderId, "order_raced");
    assert.equal(captured.length, 0);
    assert.equal(funnelCalls.length, 0);
  });

  it("persists idempotency fields on new DIRECT create", async () => {
    const captured: CreateOrderPersistenceInput[] = [];
    const key = randomUUID();
    const result = await createOrder(
      validInput({ deliveryType: "PICKUP", idempotencyKey: key }),
      mockDeps({ store: baseStore(), subtotalCents: 100, captured }),
    );

    assert.equal(result.ok, true);
    assert.equal(captured[0]?.idempotencyKey, key);
    assert.match(captured[0]?.idempotencyFingerprint ?? "", /^[a-f0-9]{64}$/);
  });
});
