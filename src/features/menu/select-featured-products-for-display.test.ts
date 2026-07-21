import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FEATURED_DISPLAY_LIMIT,
  selectFeaturedProductsForDisplay,
} from "@/features/menu/select-featured-products-for-display";
import type { PublicMenuProduct } from "@/features/menu/menu.types";

function product(name: string, id = name): PublicMenuProduct {
  return {
    id,
    name,
    description: null,
    priceCents: 1000,
    imageUrl: null,
    available: true,
    featured: true,
    sortOrder: 0,
    addons: [],
    addonGroups: [],
  };
}

describe("selectFeaturedProductsForDisplay", () => {
  it("keeps the list when at or under the limit", () => {
    const input = [
      product("A"),
      product("B"),
      product("Coca-Cola 350ml"),
    ];
    assert.deepEqual(selectFeaturedProductsForDisplay(input), input);
  });

  it("prefers pilot priority names and caps at the display limit", () => {
    const input = [
      product("Espetinho de Linguiça"),
      product("Coca-Cola 600ml"),
      product("Espetinho de Carne"),
      product("Pão Carne Queijo"),
      product("Coca-Cola 350ml"),
      product("Espetinho de Coração"),
    ];
    const selected = selectFeaturedProductsForDisplay(input);
    assert.equal(selected.length, FEATURED_DISPLAY_LIMIT);
    assert.deepEqual(
      selected.map((item) => item.name),
      ["Pão Carne Queijo", "Espetinho de Carne", "Coca-Cola 350ml"],
    );
  });
});
