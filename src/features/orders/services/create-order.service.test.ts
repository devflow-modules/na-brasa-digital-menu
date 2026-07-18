import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OrderStoreRecord } from "@/features/orders/repositories/orders.repository";
import { createOrder } from "@/features/orders/services/create-order.service";
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
    ...overrides,
  };
}

function mockDeps(options: {
  store?: OrderStoreRecord | null;
  subtotalCents: number;
  items?: PreparedOrderItem[];
  captured?: CreateOrderPersistenceInput[];
}) {
  const captured = options.captured ?? [];
  const items = options.items ?? [pricedItem(options.subtotalCents)];

  return {
    findStoreForOrderBySlug: async () => options.store ?? null,
    resolveAndPriceOrderItems: async () => ({
      ok: true as const,
      subtotalCents: options.subtotalCents,
      items,
    }),
    createOrderWithItems: async (input: CreateOrderPersistenceInput) => {
      captured.push(input);
      return { id: "order_1", code: "NB-123456-100" };
    },
    generateOrderCode: () => "NB-123456-100",
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
});
