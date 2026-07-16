import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UserRole } from "@prisma/client";
import {
  ADMIN_NAVIGATION_ITEMS,
  getAdminSafeDestination,
  getVisibleAdminNavigationItems,
  isAdminNavigationItemActive,
  isAdminNavigationItemVisible,
  normalizeAdminPathname,
  type AdminNavigationItemId,
} from "@/features/admin/chrome/admin-navigation";

const ALL_IDS: AdminNavigationItemId[] = [
  "orders",
  "counter",
  "menu",
  "settings",
];

const REAL_ROLES: UserRole[] = [
  "MASTER",
  "STORE_OWNER",
  "MANAGER",
  "OPERATOR",
  "KITCHEN",
];

function visibleIds(role: UserRole): AdminNavigationItemId[] {
  return getVisibleAdminNavigationItems(role).map((item) => item.id);
}

function activeItemsFor(pathname: string) {
  return ADMIN_NAVIGATION_ITEMS.filter((item) =>
    isAdminNavigationItemActive(pathname, item),
  );
}

describe("admin navigation configuration integrity", () => {
  it("exposes a single non-duplicated navigation source", () => {
    const ids = ADMIN_NAVIGATION_ITEMS.map((item) => item.id);
    assert.deepEqual(ids, ALL_IDS);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("has unique hrefs and base labels", () => {
    const hrefs = ADMIN_NAVIGATION_ITEMS.map((item) => item.href);
    const labels = ADMIN_NAVIGATION_ITEMS.map((item) => item.label);
    assert.equal(new Set(hrefs).size, hrefs.length);
    assert.equal(new Set(labels).size, labels.length);
  });

  it("keeps every href under /admin", () => {
    for (const item of ADMIN_NAVIGATION_ITEMS) {
      assert.ok(item.href.startsWith("/admin"));
    }
  });

  it("uses orders match only for Pedidos detail activation", () => {
    const special = ADMIN_NAVIGATION_ITEMS.filter(
      (item) => item.match === "orders",
    );
    assert.equal(special.length, 1);
    assert.equal(special[0]?.id, "orders");
  });

  it("defines an access rule for every navigation item id", () => {
    for (const id of ALL_IDS) {
      assert.equal(typeof isAdminNavigationItemVisible("MANAGER", id), "boolean");
    }
  });

  it("evaluates every real role against the shared config", () => {
    for (const role of REAL_ROLES) {
      const items = getVisibleAdminNavigationItems(role);
      assert.ok(items.length >= 1);
      for (const item of items) {
        assert.ok(ADMIN_NAVIGATION_ITEMS.some((source) => source.id === item.id));
        assert.equal(isAdminNavigationItemVisible(role, item.id), true);
      }
    }
  });
});

describe("admin navigation visibility matrix", () => {
  it("STORE_OWNER and MANAGER see full tenant chrome", () => {
    for (const role of ["STORE_OWNER", "MANAGER"] as const) {
      assert.deepEqual(visibleIds(role), ALL_IDS);
    }
  });

  it("MASTER transitional /admin sees full tenant chrome items", () => {
    assert.deepEqual(visibleIds("MASTER"), ALL_IDS);
  });

  it("OPERATOR sees Pedidos, Balcão, Cardápio and Configurações", () => {
    assert.deepEqual(visibleIds("OPERATOR"), ALL_IDS);
    const menu = getVisibleAdminNavigationItems("OPERATOR").find(
      (item) => item.id === "menu",
    );
    assert.equal(menu?.label, "Ver cardápio");
  });

  it("KITCHEN sees only Pedidos in chrome", () => {
    assert.deepEqual(visibleIds("KITCHEN"), ["orders"]);
    assert.equal(isAdminNavigationItemVisible("KITCHEN", "counter"), false);
    assert.equal(isAdminNavigationItemVisible("KITCHEN", "menu"), false);
    assert.equal(isAdminNavigationItemVisible("KITCHEN", "settings"), false);
  });
});

describe("normalizeAdminPathname", () => {
  it("strips trailing slashes without collapsing the root", () => {
    assert.equal(normalizeAdminPathname("/"), "/");
    assert.equal(normalizeAdminPathname("/admin"), "/admin");
    assert.equal(normalizeAdminPathname("/admin/"), "/admin");
    assert.equal(
      normalizeAdminPathname("/admin/pedidos/abc/"),
      "/admin/pedidos/abc",
    );
  });
});

describe("isAdminNavigationItemActive", () => {
  const orders = { href: "/admin", match: "orders" as const };
  const counter = { href: "/admin/balcao", match: "prefix" as const };
  const menu = { href: "/admin/cardapio", match: "prefix" as const };
  const settings = { href: "/admin/configuracoes", match: "prefix" as const };

  it("marks Pedidos active on queue and order detail with trailing slash", () => {
    assert.equal(isAdminNavigationItemActive("/admin", orders), true);
    assert.equal(isAdminNavigationItemActive("/admin/", orders), true);
    assert.equal(
      isAdminNavigationItemActive("/admin/pedidos/abc", orders),
      true,
    );
    assert.equal(
      isAdminNavigationItemActive("/admin/pedidos/abc/", orders),
      true,
    );
    assert.equal(isAdminNavigationItemActive("/admin/balcao", orders), false);
    assert.equal(isAdminNavigationItemActive("/admin/cardapio", orders), false);
    assert.equal(
      isAdminNavigationItemActive("/admin/configuracoes", orders),
      false,
    );
  });

  it("marks Balcão, Cardápio and Configurações with trailing slash", () => {
    assert.equal(isAdminNavigationItemActive("/admin/balcao", counter), true);
    assert.equal(isAdminNavigationItemActive("/admin/balcao/", counter), true);
    assert.equal(isAdminNavigationItemActive("/admin/cardapio", menu), true);
    assert.equal(isAdminNavigationItemActive("/admin/cardapio/", menu), true);
    assert.equal(
      isAdminNavigationItemActive("/admin/cardapio/adicionais", menu),
      true,
    );
    assert.equal(
      isAdminNavigationItemActive("/admin/cardapio/adicionais/", menu),
      true,
    );
    assert.equal(
      isAdminNavigationItemActive("/admin/configuracoes", settings),
      true,
    );
    assert.equal(
      isAdminNavigationItemActive("/admin/configuracoes/", settings),
      true,
    );
  });

  it("rejects false-prefix lookalikes", () => {
    const lookalikes = [
      "/administrator",
      "/admin-balcao",
      "/admin/cardapio-extra",
      "/admin/configuracoes-old",
      "/admin/pedidos-extra",
      "/admin/cardapios",
    ];

    for (const pathname of lookalikes) {
      assert.equal(activeItemsFor(pathname).length, 0, pathname);
    }
  });

  it("applies segment-boundary prefix rules for nested paths", () => {
    // Controlled prefix: any segment under /admin/cardapio/ activates Cardápio.
    assert.deepEqual(
      activeItemsFor("/admin/cardapio/adicionais-extra").map((item) => item.id),
      ["menu"],
    );
    assert.deepEqual(
      activeItemsFor("/admin/configuracoes/avancado").map((item) => item.id),
      ["settings"],
    );
    assert.deepEqual(
      activeItemsFor("/admin/pedidos/abc").map((item) => item.id),
      ["orders"],
    );
  });

  it("keeps exactly one active item on valid routes", () => {
    const validPaths = [
      "/admin",
      "/admin/",
      "/admin/pedidos/123",
      "/admin/balcao",
      "/admin/cardapio",
      "/admin/cardapio/adicionais",
      "/admin/configuracoes",
    ];

    for (const pathname of validPaths) {
      assert.equal(
        activeItemsFor(pathname).length,
        1,
        `expected one active item for ${pathname}`,
      );
    }
  });

  it("keeps zero active items on unknown routes", () => {
    const unknownPaths = [
      "/administrator",
      "/admin-balcao",
      "/admin/cardapio-extra",
      "/admin/configuracoes-old",
      "/admin/pedidos-extra",
      "/admin/cardapios",
      "/master",
    ];

    for (const pathname of unknownPaths) {
      assert.equal(activeItemsFor(pathname).length, 0, pathname);
    }
  });
});

describe("getAdminSafeDestination", () => {
  it("returns the first permitted chrome item for every real role", () => {
    for (const role of REAL_ROLES) {
      const destination = getAdminSafeDestination(role);
      const first = getVisibleAdminNavigationItems(role)[0];
      assert.ok(first);
      assert.equal(destination.href, first.href);
      assert.ok(destination.label.startsWith("Voltar para "));
      assert.equal(destination.label.includes("permission"), false);
      assert.equal(destination.label.includes(role), false);
    }
  });

  it("points KITCHEN and OPERATOR to Pedidos without looping to Balcão", () => {
    assert.deepEqual(getAdminSafeDestination("KITCHEN"), {
      href: "/admin",
      label: "Voltar para Pedidos",
    });
    assert.deepEqual(getAdminSafeDestination("OPERATOR"), {
      href: "/admin",
      label: "Voltar para Pedidos",
    });
  });

  it("never uses a blocked counter destination for KITCHEN", () => {
    assert.notEqual(getAdminSafeDestination("KITCHEN").href, "/admin/balcao");
  });
});
