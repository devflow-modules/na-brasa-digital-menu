import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCreateCounterOrderPayload,
  buildDraftLine,
  dedupeAddonIds,
  filterCatalogProducts,
  getDraftTotalCents,
  removeDraftLine,
  updateDraftLineQuantity,
} from "@/features/admin/counter-order/counter-order-draft";
import type { CounterCatalogProduct } from "@/features/admin/counter-order/counter-order.types";

const product: CounterCatalogProduct = {
  id: "p1",
  name: "Smash",
  description: "Blend",
  priceCents: 2800,
  addons: [
    { id: "a1", name: "Bacon", priceCents: 400 },
    { id: "a2", name: "Cheddar", priceCents: 300 },
  ],
};

describe("counter-order-draft", () => {
  it("filters products by case-insensitive search", () => {
    const products = [
      product,
      {
        ...product,
        id: "p2",
        name: "Suco de Laranja",
        priceCents: 1000,
        addons: [],
      },
    ];

    assert.equal(filterCatalogProducts(products, "  smash ").length, 1);
    assert.equal(filterCatalogProducts(products, "LARANJA").length, 1);
    assert.equal(filterCatalogProducts(products, "xyz").length, 0);
  });

  it("builds draft lines with display totals and deduped addons", () => {
    const line = buildDraftLine({
      product,
      quantity: 2,
      addonIds: ["a1", "a1", "a2"],
      notes: "  sem cebola  ",
    });

    assert.equal(line.productId, "p1");
    assert.deepEqual(line.addonIds, ["a1", "a2"]);
    assert.equal(line.unitPriceCentsForDisplay, 3500);
    assert.equal(line.lineTotalCentsForDisplay, 7000);
    assert.equal(line.notes, "sem cebola");
    assert.equal(dedupeAddonIds(["a1", "a1"]).length, 1);
  });

  it("keeps separate lines for the same product and updates quantity", () => {
    const first = buildDraftLine({
      product,
      quantity: 1,
      addonIds: [],
      notes: "linha 1",
    });
    const second = buildDraftLine({
      product,
      quantity: 2,
      addonIds: ["a1"],
      notes: "linha 2",
    });

    assert.notEqual(first.draftId, second.draftId);

    const updated = updateDraftLineQuantity(
      [first, second],
      first.draftId,
      3,
    );
    assert.equal(updated[0]?.quantity, 3);
    assert.equal(updated[0]?.lineTotalCentsForDisplay, 8400);
    assert.equal(updated[1]?.quantity, 2);
    assert.equal(getDraftTotalCents(updated), 8400 + 6400);

    const removed = removeDraftLine(updated, second.draftId);
    assert.equal(removed.length, 1);
  });

  it("builds action payload without trusted or pricing fields", () => {
    const line = buildDraftLine({
      product,
      quantity: 1,
      addonIds: ["a1"],
      notes: "extra",
    });

    const payload = buildCreateCounterOrderPayload({
      customerLabel: "  João  ",
      lines: [line],
    });

    assert.deepEqual(Object.keys(payload).sort(), [
      "customerLabel",
      "items",
    ]);
    assert.equal(payload.customerLabel, "João");
    assert.deepEqual(payload.items, [
      {
        productId: "p1",
        quantity: 1,
        addonIds: ["a1"],
        notes: "extra",
      },
    ]);
    assert.equal("storeId" in payload, false);
    assert.equal("paymentMethod" in payload, false);
    assert.equal("totalCents" in payload, false);
    assert.equal("paidAt" in payload, false);
    assert.equal("draftId" in payload, false);
    assert.equal(
      payload.items.every(
        (item) =>
          !("draftId" in item) &&
          !("unitPriceCentsForDisplay" in item) &&
          !("lineTotalCentsForDisplay" in item) &&
          !("productName" in item),
      ),
      true,
    );
  });

  it("omits empty customer label from payload", () => {
    const line = buildDraftLine({
      product,
      quantity: 1,
      addonIds: [],
    });
    const payload = buildCreateCounterOrderPayload({
      customerLabel: "   ",
      lines: [line],
    });
    assert.equal("customerLabel" in payload, false);
  });
});
