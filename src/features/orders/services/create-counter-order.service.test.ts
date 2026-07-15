import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCounterOrder } from "@/features/orders/services/create-counter-order.service";
import type { CreateOrderPersistenceInput } from "@/features/orders/types";

describe("createCounterOrder", () => {
  it("persists COUNTER order without payment, phone, WhatsApp or minimum", async () => {
    const captured: CreateOrderPersistenceInput[] = [];

    const result = await createCounterOrder(
      { storeId: "store_1", createdByUserId: "user_1" },
      {
        customerLabel: "  Mesa 2  ",
        notes: "sem gelo",
        items: [{ productId: "p1", quantity: 1, addonIds: ["a1"] }],
      },
      {
        resolveAndPriceOrderItems: async () => ({
          ok: true,
          subtotalCents: 3200,
          items: [
            {
              productId: "p1",
              productNameSnapshot: "Smash",
              productDescriptionSnapshot: null,
              quantity: 1,
              unitPriceCents: 3200,
              totalCents: 3200,
              notes: null,
              addons: [
                {
                  addonId: "a1",
                  addonNameSnapshot: "Bacon",
                  addonPriceCents: 400,
                },
              ],
            },
          ],
        }),
        createOrderWithItems: async (input) => {
          captured.push(input);
          return { id: "order_1", code: "NB-123456-100" };
        },
        generateOrderCode: () => "NB-123456-100",
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.orderId, "order_1");
    assert.equal(result.orderCode, "NB-123456-100");

    const persisted = captured[0];
    assert.ok(persisted);
    assert.equal(persisted.source, "COUNTER");
    assert.equal(persisted.deliveryType, "PICKUP");
    assert.equal(persisted.deliveryFeeCents, 0);
    assert.equal(persisted.totalCents, 3200);
    assert.equal(persisted.customerPhone, null);
    assert.equal(persisted.paymentMethod, null);
    assert.equal(persisted.changeForCents, null);
    assert.equal(persisted.whatsappMessage, null);
    assert.equal(persisted.deliveryAddress, null);
    assert.equal(persisted.createdByUserId, "user_1");
    assert.equal(persisted.storeId, "store_1");
    assert.equal(persisted.customerName, "Mesa 2");
    assert.equal(persisted.notes, "sem gelo");
    assert.equal(persisted.items.length, 1);
    assert.equal(persisted.items[0]?.addons.length, 1);
  });

  it("uses Balcão fallback label and ignores client trust fields", async () => {
    const captured: CreateOrderPersistenceInput[] = [];

    const result = await createCounterOrder(
      { storeId: "store_1", createdByUserId: "user_1" },
      {
        items: [{ productId: "p1", quantity: 1 }],
        storeId: "evil_store",
        createdByUserId: "evil_user",
        source: "DIRECT",
        paidAt: new Date().toISOString(),
        paymentMethod: "CASH",
      } as Record<string, unknown>,
      {
        resolveAndPriceOrderItems: async (storeId) => {
          assert.equal(storeId, "store_1");
          return {
            ok: true,
            subtotalCents: 1000,
            items: [
              {
                productId: "p1",
                productNameSnapshot: "Suco",
                productDescriptionSnapshot: null,
                quantity: 1,
                unitPriceCents: 1000,
                totalCents: 1000,
                notes: null,
                addons: [],
              },
            ],
          };
        },
        createOrderWithItems: async (input) => {
          captured.push(input);
          return { id: "order_2", code: "NB-222222-200" };
        },
        generateOrderCode: () => "NB-222222-200",
      },
    );

    assert.equal(result.ok, true);
    const persisted = captured[0];
    assert.ok(persisted);
    assert.equal(persisted.customerName, "Balcão");
    assert.equal(persisted.source, "COUNTER");
    assert.equal(persisted.createdByUserId, "user_1");
    assert.equal(persisted.storeId, "store_1");
    assert.equal(persisted.paymentMethod, null);
  });

  it("rejects empty payload and surfaces pricing failures", async () => {
    const empty = await createCounterOrder(
      { storeId: "store_1", createdByUserId: "user_1" },
      { items: [] },
      {
        resolveAndPriceOrderItems: async () => {
          throw new Error("should not price empty schema failure");
        },
        createOrderWithItems: async () => {
          throw new Error("should not persist");
        },
        generateOrderCode: () => "NB-000000-000",
      },
    );
    assert.equal(empty.ok, false);

    const pricingFail = await createCounterOrder(
      { storeId: "store_1", createdByUserId: "user_1" },
      { items: [{ productId: "missing", quantity: 1 }] },
      {
        resolveAndPriceOrderItems: async () => ({
          ok: false,
          message: "Um ou mais produtos não foram encontrados.",
        }),
        createOrderWithItems: async () => {
          throw new Error("should not persist");
        },
        generateOrderCode: () => "NB-000000-000",
      },
    );
    assert.equal(pricingFail.ok, false);
    if (pricingFail.ok) return;
    assert.match(pricingFail.message, /não foram encontrados/i);
  });
});
