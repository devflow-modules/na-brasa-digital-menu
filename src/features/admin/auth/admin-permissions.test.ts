import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canReadStoreSettings,
  canToggleStoreOpen,
  canTransitionOrderStatus,
  canUpdateStoreSettings,
  getAdminPermissions,
  hasAdminPermission,
} from "@/features/admin/auth/admin-permissions";

describe("admin-permissions matrix", () => {
  it("MASTER and STORE_OWNER and MANAGER can cancel", () => {
    for (const role of ["MASTER", "STORE_OWNER", "MANAGER"] as const) {
      assert.equal(hasAdminPermission(role, "orders.status.cancel"), true);
      assert.equal(
        canTransitionOrderStatus(role, "PENDING", "CANCELLED", "PICKUP"),
        true,
      );
    }
  });

  it("OPERATOR cannot cancel but can confirm and complete", () => {
    assert.equal(hasAdminPermission("OPERATOR", "orders.status.cancel"), false);
    assert.equal(
      canTransitionOrderStatus("OPERATOR", "PENDING", "CANCELLED", "PICKUP"),
      false,
    );
    assert.equal(
      canTransitionOrderStatus("OPERATOR", "PENDING", "CONFIRMED", "PICKUP"),
      true,
    );
    assert.equal(
      canTransitionOrderStatus("OPERATOR", "READY", "COMPLETED", "PICKUP"),
      true,
    );
  });

  it("KITCHEN only prepares and marks ready", () => {
    assert.equal(hasAdminPermission("KITCHEN", "orders.status.confirm"), false);
    assert.equal(hasAdminPermission("KITCHEN", "orders.status.cancel"), false);
    assert.equal(hasAdminPermission("KITCHEN", "orders.status.complete"), false);
    assert.equal(hasAdminPermission("KITCHEN", "orders.status.dispatch"), false);
    assert.equal(
      canTransitionOrderStatus("KITCHEN", "PENDING", "CONFIRMED", "PICKUP"),
      false,
    );
    assert.equal(
      canTransitionOrderStatus("KITCHEN", "CONFIRMED", "PREPARING", "PICKUP"),
      true,
    );
    assert.equal(
      canTransitionOrderStatus("KITCHEN", "PREPARING", "READY", "PICKUP"),
      true,
    );
    assert.equal(
      canTransitionOrderStatus("KITCHEN", "READY", "COMPLETED", "PICKUP"),
      false,
    );
    assert.equal(
      canTransitionOrderStatus(
        "KITCHEN",
        "READY",
        "OUT_FOR_DELIVERY",
        "DELIVERY",
      ),
      false,
    );
  });

  it("does not allow invalid transitions even with full permissions", () => {
    assert.equal(
      canTransitionOrderStatus("MASTER", "PENDING", "READY", "PICKUP"),
      false,
    );
    assert.equal(
      canTransitionOrderStatus("MASTER", "COMPLETED", "CANCELLED", "PICKUP"),
      false,
    );
  });

  it("getAdminPermissions returns expected sizes", () => {
    assert.equal(getAdminPermissions("MASTER").length, 23);
    assert.equal(getAdminPermissions("OPERATOR").length, 11);
    assert.equal(getAdminPermissions("KITCHEN").length, 6);
  });

  it("menu permissions by role", () => {
    assert.equal(hasAdminPermission("OPERATOR", "menu.product.toggleAvailability"), true);
    assert.equal(hasAdminPermission("OPERATOR", "menu.product.update"), false);
    assert.equal(hasAdminPermission("KITCHEN", "menu.read"), true);
    assert.equal(hasAdminPermission("KITCHEN", "menu.product.create"), false);
    assert.equal(hasAdminPermission("MANAGER", "menu.product.create"), true);
    assert.equal(hasAdminPermission("STORE_OWNER", "menu.category.update"), true);
  });

  it("addon permissions by role", () => {
    for (const role of ["MASTER", "STORE_OWNER", "MANAGER"] as const) {
      assert.equal(hasAdminPermission(role, "menu.addon.create"), true);
      assert.equal(hasAdminPermission(role, "menu.addon.linkProduct"), true);
      assert.equal(hasAdminPermission(role, "menu.addon.unlinkProduct"), true);
    }
    assert.equal(hasAdminPermission("OPERATOR", "menu.addon.read"), true);
    assert.equal(hasAdminPermission("OPERATOR", "menu.addon.create"), false);
    assert.equal(hasAdminPermission("OPERATOR", "menu.addon.linkProduct"), false);
    assert.equal(hasAdminPermission("KITCHEN", "menu.addon.read"), true);
    assert.equal(hasAdminPermission("KITCHEN", "menu.addon.update"), false);
  });

  it("store settings permissions by role", () => {
    for (const role of ["MASTER", "STORE_OWNER", "MANAGER"] as const) {
      assert.equal(canReadStoreSettings(role), true);
      assert.equal(canUpdateStoreSettings(role), true);
      assert.equal(canToggleStoreOpen(role), true);
      assert.equal(hasAdminPermission(role, "store.settings.update"), true);
    }
    assert.equal(canReadStoreSettings("OPERATOR"), true);
    assert.equal(canUpdateStoreSettings("OPERATOR"), false);
    assert.equal(canToggleStoreOpen("OPERATOR"), true);
    assert.equal(canReadStoreSettings("KITCHEN"), true);
    assert.equal(canUpdateStoreSettings("KITCHEN"), false);
    assert.equal(canToggleStoreOpen("KITCHEN"), false);
  });
});
