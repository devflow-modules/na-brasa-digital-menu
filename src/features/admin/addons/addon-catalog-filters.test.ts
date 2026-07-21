import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addonMatchesFilters,
  countAddonCatalog,
  filterAddonCatalog,
} from "@/features/admin/addons/addon-catalog-filters";
import type { AdminAddon } from "@/features/admin/addons/admin-addons.types";

const addons: AdminAddon[] = [
  {
    id: "a1",
    name: "Bacon extra",
    description: null,
    priceCents: 600,
    active: true,
    sortOrder: 0,
    linkedProducts: [
      { id: "p1", name: "X-Burger" },
      { id: "p2", name: "X-Bacon" },
    ],
  },
  {
    id: "a2",
    name: "Cheddar",
    description: null,
    priceCents: 400,
    active: true,
    sortOrder: 1,
    linkedProducts: [],
  },
  {
    id: "a3",
    name: "Ovo",
    description: null,
    priceCents: 300,
    active: false,
    sortOrder: 2,
    linkedProducts: [{ id: "p1", name: "X-Burger" }],
  },
];

describe("addon-catalog-filters", () => {
  it("counts catalog counters", () => {
    assert.deepEqual(countAddonCatalog(addons), {
      totalAddons: 3,
      activeAddons: 2,
      totalLinks: 3,
    });
  });

  it("matches addon name case-insensitively with trimmed search", () => {
    assert.equal(
      addonMatchesFilters(addons[0]!, {
        search: "  BACON ",
        status: "all",
        links: "all",
      }),
      true,
    );
    assert.equal(
      addonMatchesFilters(addons[0]!, {
        search: "cheddar",
        status: "all",
        links: "all",
      }),
      false,
    );
  });

  it("filters by status and link presence", () => {
    const inactive = filterAddonCatalog(addons, {
      search: "",
      status: "inactive",
      links: "all",
    });
    assert.equal(inactive.length, 1);
    assert.equal(inactive[0]?.name, "Ovo");

    const withoutLinks = filterAddonCatalog(addons, {
      search: "",
      status: "all",
      links: "without-links",
    });
    assert.equal(withoutLinks.length, 1);
    assert.equal(withoutLinks[0]?.name, "Cheddar");

    const withLinks = filterAddonCatalog(addons, {
      search: "",
      status: "active",
      links: "with-links",
    });
    assert.equal(withLinks.length, 1);
    assert.equal(withLinks[0]?.name, "Bacon extra");
  });
});
