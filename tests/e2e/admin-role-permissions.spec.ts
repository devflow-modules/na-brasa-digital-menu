import { expect, test } from "@playwright/test";
import { loginAdmin, loginAsUser } from "./helpers/auth";
import { attemptOrderStatusUpdate } from "./helpers/admin-status-service";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import {
  cleanupE2eOrders,
  cleanupE2eStoreUsers,
  createE2ePickupOrder,
  disconnectE2ePrisma,
  getOrderStatus,
} from "./helpers/db";
import { uniqueCustomerName } from "./helpers/test-data";

test.describe("admin role permissions", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eOrders();
    await cleanupE2eStoreUsers();
    await disconnectE2ePrisma();
  });

  test("STORE_OWNER sees confirm/cancel and can confirm PENDING", async ({
    page,
  }) => {
    const owner = await ensureE2eStoreUser({
      role: "STORE_OWNER",
      email: "e2e-store-owner-perms@example.com",
    });
    const order = await createE2ePickupOrder({
      customerName: uniqueCustomerName("Role Owner"),
      status: "PENDING",
    });

    await loginAsUser(page, owner);
    await page.goto(`/admin/pedidos/${order.id}`);

    await expect(page.getByTestId("order-status-action-CONFIRMED")).toBeVisible();
    await expect(page.getByTestId("order-status-action-CANCELLED")).toBeVisible();

    await page.getByTestId("order-status-action-CONFIRMED").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "CONFIRMED",
      { timeout: 15_000 },
    );
    expect(await getOrderStatus(order.id)).toBe("CONFIRMED");
  });

  test("MANAGER can cancel a PENDING order", async ({ page }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-manager-perms@example.com",
    });
    const order = await createE2ePickupOrder({
      customerName: uniqueCustomerName("Role Manager"),
      status: "PENDING",
    });

    await loginAsUser(page, manager);
    await page.goto(`/admin/pedidos/${order.id}`);

    await expect(page.getByTestId("order-status-action-CANCELLED")).toBeVisible();
    await page.getByTestId("order-status-action-CANCELLED").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "CANCELLED",
      { timeout: 15_000 },
    );
    expect(await getOrderStatus(order.id)).toBe("CANCELLED");
  });

  test("OPERATOR confirms PENDING, cannot cancel (UI + server)", async ({
    page,
  }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-store-operator-perms@example.com",
    });
    expect(operator.storeId).toBeTruthy();

    const order = await createE2ePickupOrder({
      customerName: uniqueCustomerName("Role Operator"),
      status: "PENDING",
    });

    await loginAsUser(page, operator);
    await page.goto(`/admin/pedidos/${order.id}`);

    await expect(page.getByTestId("order-status-action-CONFIRMED")).toBeVisible();
    await expect(page.getByTestId("order-status-action-CANCELLED")).toHaveCount(
      0,
    );

    const denied = await attemptOrderStatusUpdate({
      orderId: order.id,
      nextStatus: "CANCELLED",
      storeId: operator.storeId!,
      role: "OPERATOR",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.message).toBe(
        "Você não tem permissão para executar esta ação.",
      );
    }
    expect(await getOrderStatus(order.id)).toBe("PENDING");

    await page.getByTestId("order-status-action-CONFIRMED").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "CONFIRMED",
      { timeout: 15_000 },
    );
    expect(await getOrderStatus(order.id)).toBe("CONFIRMED");
  });

  test("KITCHEN prepares and marks ready, cannot confirm/complete/cancel", async ({
    page,
  }) => {
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-store-kitchen-perms@example.com",
    });
    expect(kitchen.storeId).toBeTruthy();

    const pending = await createE2ePickupOrder({
      customerName: uniqueCustomerName("Role Kitchen Pending"),
      status: "PENDING",
    });

    await loginAsUser(page, kitchen);
    await page.goto(`/admin/pedidos/${pending.id}`);

    await expect(page.getByTestId("order-status-action-CONFIRMED")).toHaveCount(
      0,
    );
    await expect(page.getByTestId("order-status-action-CANCELLED")).toHaveCount(
      0,
    );
    await expect(page.getByTestId("order-status-actions-empty")).toBeVisible();

    const confirmed = await createE2ePickupOrder({
      customerName: uniqueCustomerName("Role Kitchen Confirmed"),
      status: "CONFIRMED",
    });
    await page.goto(`/admin/pedidos/${confirmed.id}`);
    await expect(page.getByTestId("order-status-action-PREPARING")).toBeVisible();
    await expect(page.getByTestId("order-status-action-CANCELLED")).toHaveCount(
      0,
    );

    await page.getByTestId("order-status-action-PREPARING").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "PREPARING",
      { timeout: 15_000 },
    );

    await expect(page.getByTestId("order-status-action-READY")).toBeVisible();
    await page.getByTestId("order-status-action-READY").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "READY",
      { timeout: 15_000 },
    );

    await expect(page.getByTestId("order-status-action-COMPLETED")).toHaveCount(
      0,
    );
    await expect(page.getByTestId("order-status-action-CANCELLED")).toHaveCount(
      0,
    );

    const completeDenied = await attemptOrderStatusUpdate({
      orderId: confirmed.id,
      nextStatus: "COMPLETED",
      storeId: kitchen.storeId!,
      role: "KITCHEN",
    });
    expect(completeDenied.ok).toBe(false);
    expect(await getOrderStatus(confirmed.id)).toBe("READY");
  });

  test("MASTER transitional /admin sees confirm and cancel on PENDING", async ({
    page,
  }) => {
    const order = await createE2ePickupOrder({
      customerName: uniqueCustomerName("Role Master"),
      status: "PENDING",
    });

    await loginAdmin(page);
    await page.goto(`/admin/pedidos/${order.id}`);

    await expect(page.getByTestId("order-status-action-CONFIRMED")).toBeVisible();
    await expect(page.getByTestId("order-status-action-CANCELLED")).toBeVisible();
    await expect(page.getByTestId("order-status-role-note")).toContainText(
      "Master",
    );
  });
});
