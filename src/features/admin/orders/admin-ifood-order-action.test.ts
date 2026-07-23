import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ifoodCommandLabel,
  permissionForIfoodCommand,
  resolveNextIfoodAdminCommand,
} from "@/features/admin/orders/admin-ifood-order-action";

describe("resolveNextIfoodAdminCommand", () => {
  it("maps projected statuses to ledger commands", () => {
    assert.equal(
      resolveNextIfoodAdminCommand({ status: "PENDING", snapshot: {} }),
      "CONFIRM",
    );
    assert.equal(
      resolveNextIfoodAdminCommand({ status: "CONFIRMED", snapshot: {} }),
      "START_PREPARATION",
    );
    assert.equal(
      resolveNextIfoodAdminCommand({
        status: "PREPARING",
        snapshot: { orderType: "DELIVERY" },
      }),
      "DISPATCH",
    );
    assert.equal(
      resolveNextIfoodAdminCommand({
        status: "PREPARING",
        snapshot: { orderType: "TAKEOUT" },
      }),
      "READY_TO_PICKUP",
    );
    assert.equal(
      resolveNextIfoodAdminCommand({
        status: "OUT_FOR_DELIVERY",
        snapshot: { orderType: "DELIVERY" },
      }),
      null,
    );
  });

  it("returns null when terminal orderType is missing", () => {
    assert.equal(
      resolveNextIfoodAdminCommand({
        status: "PREPARING",
        snapshot: {},
      }),
      null,
    );
  });
});

describe("ifood admin command labels and permissions", () => {
  it("uses existing RBAC permission keys", () => {
    assert.equal(permissionForIfoodCommand("CONFIRM"), "orders.status.confirm");
    assert.equal(
      permissionForIfoodCommand("START_PREPARATION"),
      "orders.status.prepare",
    );
    assert.equal(
      permissionForIfoodCommand("READY_TO_PICKUP"),
      "orders.status.ready",
    );
    assert.equal(
      permissionForIfoodCommand("DISPATCH"),
      "orders.status.dispatch",
    );
    assert.equal(ifoodCommandLabel("CONFIRM"), "Confirmar pedido");
    assert.equal(ifoodCommandLabel("DISPATCH"), "Despachar pedido");
  });
});
