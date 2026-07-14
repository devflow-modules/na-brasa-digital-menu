import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransitionOrderStatus,
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
    assert.equal(getAdminPermissions("MASTER").length, 7);
    assert.equal(getAdminPermissions("OPERATOR").length, 6);
    assert.equal(getAdminPermissions("KITCHEN").length, 3);
  });
});
