import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatAddonGroupSelectionHint,
  partitionProductAddons,
  validateAddonGroupLimits,
  validateAddonSelectionForProduct,
  type CatalogProductForAddonSelection,
} from "@/features/orders/addon-group-selection";

function cheeseProduct(): CatalogProductForAddonSelection {
  return {
    productAddons: [
      {
        addon: {
          id: "bacon",
          name: "Bacon extra",
          priceCents: 500,
          active: true,
        },
      },
      {
        addon: {
          id: "cheddar",
          name: "Cheddar extra",
          priceCents: 300,
          active: true,
        },
      },
      {
        addon: {
          id: "prato",
          name: "Queijo prato extra",
          priceCents: 300,
          active: true,
        },
      },
    ],
    addonGroups: [
      {
        id: "g-cheese",
        name: "Escolha o queijo extra",
        minSelection: 0,
        maxSelection: 1,
        active: true,
        sortOrder: 0,
        options: [
          {
            sortOrder: 0,
            addon: {
              id: "cheddar",
              name: "Cheddar extra",
              priceCents: 300,
              active: true,
            },
          },
          {
            sortOrder: 1,
            addon: {
              id: "prato",
              name: "Queijo prato extra",
              priceCents: 300,
              active: true,
            },
          },
        ],
      },
    ],
  };
}

describe("addon-group-selection", () => {
  it("partitions grouped addons away from independent list", () => {
    const parts = partitionProductAddons(cheeseProduct());
    assert.deepEqual(
      parts.independentAddons.map((addon) => addon.id),
      ["bacon"],
    );
    assert.equal(parts.activeGroups.length, 1);
    assert.equal(parts.groupByAddonId.get("cheddar")?.id, "g-cheese");
  });

  it("allows zero selection for optional max=1 group", () => {
    const result = validateAddonSelectionForProduct(cheeseProduct(), ["bacon"]);
    assert.equal(result.ok, true);
  });

  it("allows cheddar or prato alone", () => {
    assert.equal(
      validateAddonSelectionForProduct(cheeseProduct(), ["cheddar"]).ok,
      true,
    );
    assert.equal(
      validateAddonSelectionForProduct(cheeseProduct(), ["prato"]).ok,
      true,
    );
  });

  it("rejects cheddar and prato together", () => {
    const result = validateAddonSelectionForProduct(cheeseProduct(), [
      "cheddar",
      "prato",
    ]);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /máximo 1/i);
  });

  it("rejects required group with zero selections", () => {
    const product = cheeseProduct();
    product.addonGroups[0]!.minSelection = 1;
    const result = validateAddonSelectionForProduct(product, []);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /Selecione uma opção/);
  });

  it("rejects foreign addon ids", () => {
    const result = validateAddonSelectionForProduct(cheeseProduct(), [
      "foreign",
    ]);
    assert.equal(result.ok, false);
  });

  it("formats selection hints", () => {
    assert.equal(
      formatAddonGroupSelectionHint({ minSelection: 0, maxSelection: 1 }),
      "Opcional · escolha até 1",
    );
    assert.equal(
      formatAddonGroupSelectionHint({ minSelection: 1, maxSelection: 1 }),
      "Obrigatório · escolha 1",
    );
  });

  it("validates group limit invariants", () => {
    assert.equal(
      validateAddonGroupLimits({
        minSelection: 0,
        maxSelection: 1,
        optionCount: 2,
      }).ok,
      true,
    );
    assert.equal(
      validateAddonGroupLimits({
        minSelection: 2,
        maxSelection: 1,
        optionCount: 2,
      }).ok,
      false,
    );
    assert.equal(
      validateAddonGroupLimits({
        minSelection: 0,
        maxSelection: 3,
        optionCount: 2,
      }).ok,
      false,
    );
  });
});
