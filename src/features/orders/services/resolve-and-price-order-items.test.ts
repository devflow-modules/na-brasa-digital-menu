import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CatalogProductRecord } from "@/features/orders/repositories/orders.repository";
import { priceOrderItemsFromCatalog } from "@/features/orders/services/resolve-and-price-order-items";

function product(
  overrides: Partial<CatalogProductRecord> &
    Pick<CatalogProductRecord, "id" | "name" | "priceCents">,
): CatalogProductRecord {
  return {
    description: null,
    active: true,
    available: true,
    productAddons: [],
    ...overrides,
  };
}

describe("priceOrderItemsFromCatalog", () => {
  it("prices products for the provided catalog and builds snapshots", () => {
    const result = priceOrderItemsFromCatalog(
      [
        product({
          id: "p1",
          name: "Smash",
          description: "Blend 160g",
          priceCents: 2800,
          productAddons: [
            {
              addon: {
                id: "a1",
                name: "Bacon",
                priceCents: 400,
                active: true,
              },
            },
          ],
        }),
      ],
      [{ productId: "p1", quantity: 2, addonIds: ["a1"], notes: "sem cebola" }],
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.subtotalCents, 6400);
    assert.equal(result.items[0]?.productNameSnapshot, "Smash");
    assert.equal(result.items[0]?.productDescriptionSnapshot, "Blend 160g");
    assert.equal(result.items[0]?.unitPriceCents, 3200);
    assert.equal(result.items[0]?.totalCents, 6400);
    assert.equal(result.items[0]?.notes, "sem cebola");
    assert.equal(result.items[0]?.addons[0]?.addonNameSnapshot, "Bacon");
    assert.equal(result.items[0]?.addons[0]?.addonPriceCents, 400);
  });

  it("rejects products missing from the tenant catalog", () => {
    const result = priceOrderItemsFromCatalog(
      [product({ id: "p1", name: "Smash", priceCents: 2800 })],
      [{ productId: "other-tenant", quantity: 1, addonIds: [] }],
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /não foram encontrados/i);
  });

  it("rejects inactive products", () => {
    const result = priceOrderItemsFromCatalog(
      [product({ id: "p1", name: "Smash", priceCents: 2800, active: false })],
      [{ productId: "p1", quantity: 1, addonIds: [] }],
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /Smash/);
  });

  it("rejects unavailable products", () => {
    const result = priceOrderItemsFromCatalog(
      [
        product({
          id: "p1",
          name: "Smash",
          priceCents: 2800,
          available: false,
        }),
      ],
      [{ productId: "p1", quantity: 1, addonIds: [] }],
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, "Produto indisponível no momento.");
  });

  it("rejects unlinked or inactive addons", () => {
    const catalog = [
      product({
        id: "p1",
        name: "Smash",
        priceCents: 2800,
        productAddons: [
          {
            addon: {
              id: "a1",
              name: "Bacon",
              priceCents: 400,
              active: false,
            },
          },
        ],
      }),
    ];

    const inactive = priceOrderItemsFromCatalog(catalog, [
      { productId: "p1", quantity: 1, addonIds: ["a1"] },
    ]);
    assert.equal(inactive.ok, false);

    const unlinked = priceOrderItemsFromCatalog(catalog, [
      { productId: "p1", quantity: 1, addonIds: ["not-linked"] },
    ]);
    assert.equal(unlinked.ok, false);
  });

  it("does not trust client prices and ignores empty cart", () => {
    const result = priceOrderItemsFromCatalog(
      [product({ id: "p1", name: "Smash", priceCents: 2800 })],
      [{ productId: "p1", quantity: 1, addonIds: [] }],
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.subtotalCents, 2800);

    const empty = priceOrderItemsFromCatalog(
      [product({ id: "p1", name: "Smash", priceCents: 2800 })],
      [],
    );
    assert.equal(empty.ok, false);
  });

  it("deduplicates repeated addonIds on the same line", () => {
    const result = priceOrderItemsFromCatalog(
      [
        product({
          id: "p1",
          name: "Smash",
          priceCents: 2800,
          productAddons: [
            {
              addon: {
                id: "a1",
                name: "Bacon",
                priceCents: 400,
                active: true,
              },
            },
          ],
        }),
      ],
      [{ productId: "p1", quantity: 1, addonIds: ["a1", "a1", "a1"] }],
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.items[0]?.addons.length, 1);
    assert.equal(result.items[0]?.unitPriceCents, 3200);
    assert.equal(result.subtotalCents, 3200);
  });

  it("keeps separate lines when the same product appears twice", () => {
    const result = priceOrderItemsFromCatalog(
      [product({ id: "p1", name: "Smash", priceCents: 2800 })],
      [
        { productId: "p1", quantity: 1, addonIds: [], notes: "linha 1" },
        { productId: "p1", quantity: 2, addonIds: [], notes: "linha 2" },
      ],
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.items.length, 2);
    assert.equal(result.subtotalCents, 8400);
    assert.equal(result.items[0]?.notes, "linha 1");
    assert.equal(result.items[1]?.notes, "linha 2");
  });
});
