import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countMenuCatalog,
  filterMenuCatalog,
  productMatchesMenuFilters,
} from "@/features/admin/menu/menu-catalog-filters";
import type { AdminMenuCategory } from "@/features/admin/menu/admin-menu.types";

const categories: AdminMenuCategory[] = [
  {
    id: "c1",
    name: "Hambúrgueres",
    description: null,
    sortOrder: 0,
    active: true,
    products: [
      {
        id: "p1",
        categoryId: "c1",
        name: "X-Bacon",
        description: null,
        priceCents: 2800,
        active: true,
        available: true,
        sortOrder: 0,
      },
      {
        id: "p2",
        categoryId: "c1",
        name: "X-Salada",
        description: null,
        priceCents: 2500,
        active: false,
        available: true,
        sortOrder: 1,
      },
    ],
  },
  {
    id: "c2",
    name: "Bebidas",
    description: null,
    sortOrder: 1,
    active: true,
    products: [
      {
        id: "p3",
        categoryId: "c2",
        name: "Refrigerante",
        description: null,
        priceCents: 600,
        active: true,
        available: false,
        sortOrder: 0,
      },
    ],
  },
];

describe("menu-catalog-filters", () => {
  it("counts full catalog counters", () => {
    assert.deepEqual(countMenuCatalog(categories), {
      totalProducts: 3,
      activeProducts: 2,
      unavailableProducts: 1,
    });
  });

  it("matches product name case-insensitively with trimmed search", () => {
    assert.equal(
      productMatchesMenuFilters(categories[0]!.products[0]!, {
        search: "  x-bacon ",
        status: "all",
      }),
      true,
    );
    assert.equal(
      productMatchesMenuFilters(categories[0]!.products[0]!, {
        search: "salada",
        status: "all",
      }),
      false,
    );
  });

  it("filters by status and category", () => {
    const unavailable = filterMenuCatalog(categories, {
      search: "",
      status: "unavailable",
      categoryId: "",
    });
    assert.equal(unavailable.length, 1);
    assert.equal(unavailable[0]?.products[0]?.name, "Refrigerante");

    const burgers = filterMenuCatalog(categories, {
      search: "",
      status: "all",
      categoryId: "c1",
    });
    assert.equal(burgers.length, 1);
    assert.equal(burgers[0]?.products.length, 2);
  });
});
