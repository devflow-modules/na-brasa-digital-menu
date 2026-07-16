import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAdminLoginPath,
  shouldStartAdminNotificationPolling,
} from "@/features/admin/orders/new-order-notifications/admin-login-route-gating";

describe("admin login route gating for notifications", () => {
  it("does not start polling on /admin/login", () => {
    assert.equal(isAdminLoginPath("/admin/login"), true);
    assert.equal(shouldStartAdminNotificationPolling("/admin/login"), false);
  });

  it("starts polling on authenticated admin routes", () => {
    for (const pathname of [
      "/admin",
      "/admin/",
      "/admin/pedidos/abc",
      "/admin/balcao",
      "/admin/configuracoes",
    ]) {
      assert.equal(isAdminLoginPath(pathname), false);
      assert.equal(shouldStartAdminNotificationPolling(pathname), true);
    }
  });

  it("does not treat nested login-looking paths as the login route", () => {
    assert.equal(isAdminLoginPath("/admin/login/extra"), false);
    assert.equal(
      shouldStartAdminNotificationPolling("/admin/login/extra"),
      true,
    );
  });

  it("allows polling when pathname is null (non-login)", () => {
    assert.equal(isAdminLoginPath(null), false);
    assert.equal(shouldStartAdminNotificationPolling(null), true);
  });
});
