import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import {
  cleanupE2eOrders,
  createE2eCounterOrder,
  createE2ePickupOrder,
  disconnectE2ePrisma,
} from "./helpers/db";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import { uniqueCustomerName } from "./helpers/test-data";

test.describe("admin orders", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eOrders();
    await disconnectE2ePrisma();
  });

  test("lists E2E order and shows detail fields", async ({ page }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-orders-manager@example.com",
    });
    const customerName = uniqueCustomerName("Admin Orders Customer");
    const order = await createE2ePickupOrder({ customerName });

    await loginAsUser(page, manager);
    await expect(page.getByTestId("admin-orders-list")).toBeVisible();
    await expect(page.getByText(customerName).first()).toBeVisible();

    const directRow = page.locator(
      `[data-testid="admin-order-row"][data-order-id="${order.id}"]`,
    );
    await expect(directRow.getByTestId("order-source-badge")).toHaveAttribute(
      "data-source",
      "DIRECT",
    );
    await expect(directRow.getByTestId("order-source-badge")).toHaveText(
      "Online",
    );
    await expect(directRow.getByTestId("order-status-badge")).toBeVisible();

    await page.goto(`/admin/pedidos/${order.id}`);
    const detail = page.getByTestId("admin-order-detail");
    await expect(detail).toBeVisible();
    await expect(detail.getByTestId("order-source-badge")).toHaveAttribute(
      "data-source",
      "DIRECT",
    );
    await expect(detail.getByTestId("order-source-badge")).toHaveText("Online");
    await expect(detail.getByTestId("order-status-badge")).toBeVisible();
    await expect(detail.locator("dd").filter({ hasText: customerName })).toBeVisible();
    await expect(
      detail.locator("dd").filter({ hasText: "(13) 98888-7777" }),
    ).toBeVisible();
    await expect(detail.getByRole("heading", { name: "Itens" })).toBeVisible();
    await expect(detail.getByText("Total").first()).toBeVisible();
    await expect(
      detail.getByRole("heading", { name: "Mensagem WhatsApp" }),
    ).toBeVisible();
    await expect(detail.locator("pre")).toContainText("Novo pedido");
  });

  test("shows Balcão origin for COUNTER orders in list and detail", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-orders-counter-manager@example.com",
    });
    const customerName = uniqueCustomerName("Admin Counter Source");
    const order = await createE2eCounterOrder({ customerName });

    await loginAsUser(page, manager);
    await expect(page.getByTestId("admin-orders-list")).toBeVisible();

    const counterRow = page.locator(
      `[data-testid="admin-order-row"][data-order-id="${order.id}"]`,
    );
    await expect(counterRow.getByTestId("order-source-badge")).toHaveAttribute(
      "data-source",
      "COUNTER",
    );
    await expect(counterRow.getByTestId("order-source-badge")).toHaveText(
      "Balcão",
    );
    await expect(counterRow.getByTestId("order-status-badge")).toBeVisible();

    await page.goto(`/admin/pedidos/${order.id}`);
    const detail = page.getByTestId("admin-order-detail");
    await expect(detail.getByTestId("order-source-badge")).toHaveAttribute(
      "data-source",
      "COUNTER",
    );
    await expect(detail.getByTestId("order-source-badge")).toHaveText("Balcão");
    await expect(detail.getByTestId("order-status-badge")).toBeVisible();
  });
});
