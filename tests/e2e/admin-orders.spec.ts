import { expect, test } from "@playwright/test";
import { loginAdmin } from "./helpers/auth";
import {
  cleanupE2eOrders,
  createE2ePickupOrder,
  disconnectE2ePrisma,
} from "./helpers/db";
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
    const customerName = uniqueCustomerName("Admin Orders Customer");
    const order = await createE2ePickupOrder({ customerName });

    await loginAdmin(page);
    await expect(page.getByTestId("admin-orders-list")).toBeVisible();
    await expect(page.getByText(customerName).first()).toBeVisible();

    await page.goto(`/admin/pedidos/${order.id}`);
    const detail = page.getByTestId("admin-order-detail");
    await expect(detail).toBeVisible();
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
});
