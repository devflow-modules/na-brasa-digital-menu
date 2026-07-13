import { expect, test } from "@playwright/test";
import { loginAdmin } from "./helpers/auth";
import {
  cleanupE2eOrders,
  createE2ePickupOrder,
  disconnectE2ePrisma,
  getOrderStatus,
} from "./helpers/db";
import { uniqueCustomerName } from "./helpers/test-data";

test.describe("admin order status", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eOrders();
    await disconnectE2ePrisma();
  });

  test("PICKUP flow PENDING → COMPLETED and hides actions when done", async ({
    page,
  }) => {
    const customerName = uniqueCustomerName("Admin Status Customer");
    const order = await createE2ePickupOrder({
      customerName,
      status: "PENDING",
    });

    await loginAdmin(page);
    await page.goto(`/admin/pedidos/${order.id}`);

    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "PENDING",
    );

    await page.getByTestId("order-status-action-CONFIRMED").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "CONFIRMED",
      { timeout: 15_000 },
    );
    expect(await getOrderStatus(order.id)).toBe("CONFIRMED");

    await page.getByTestId("order-status-action-PREPARING").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "PREPARING",
      { timeout: 15_000 },
    );

    await page.getByTestId("order-status-action-READY").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "READY",
      { timeout: 15_000 },
    );

    await page.getByTestId("order-status-action-COMPLETED").click();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "COMPLETED",
      { timeout: 15_000 },
    );
    expect(await getOrderStatus(order.id)).toBe("COMPLETED");

    await expect(page.getByTestId("order-status-actions-empty")).toBeVisible();
    await expect(
      page.getByTestId("order-status-action-CONFIRMED"),
    ).toHaveCount(0);
  });
});
