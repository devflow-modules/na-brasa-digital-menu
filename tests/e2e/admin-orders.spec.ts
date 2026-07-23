import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import {
  cleanupE2eOrders,
  createE2eCounterOrder,
  createE2eIfoodOrder,
  createE2ePickupOrder,
  disconnectE2ePrisma,
  getPrisma,
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

  test("shows iFood orders read-only fields and ledger action for MANAGER", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-orders-ifood-manager@example.com",
    });
    const customerName = uniqueCustomerName("Admin Ifood Source");
    const order = await createE2eIfoodOrder({
      customerName,
      status: "PENDING",
      notes: "Sem cebola E2E",
      withProjectionLink: true,
    });

    await loginAsUser(page, manager);
    await expect(page.getByTestId("admin-orders-list")).toBeVisible();

    const ifoodRow = page.locator(
      `[data-testid="admin-order-row"][data-order-id="${order.id}"]`,
    );
    await expect(ifoodRow.getByTestId("order-source-badge")).toHaveAttribute(
      "data-source",
      "IFOOD",
    );
    await expect(ifoodRow.getByTestId("order-source-badge")).toHaveText("iFood");
    await expect(ifoodRow.getByTestId("admin-order-payment-label")).toHaveText(
      "Pagamento gerenciado pelo iFood",
    );
    await expect(ifoodRow.getByTestId("admin-order-payment-label")).not.toHaveText(
      "Pagamento pendente",
    );

    await page.goto(`/admin/pedidos/${order.id}`);
    const detail = page.getByTestId("admin-order-detail");
    await expect(detail.getByTestId("order-source-badge")).toHaveAttribute(
      "data-source",
      "IFOOD",
    );
    await expect(detail.getByTestId("order-payment-label")).toHaveText(
      "Pagamento gerenciado pelo iFood",
    );
    await expect(detail.getByTestId("order-ifood-status-note")).toContainText(
      "Status controlado pelo iFood",
    );
    await expect(detail.getByTestId("order-ifood-action-CONFIRM")).toBeVisible();
    await expect(detail.getByTestId("order-status-action-CONFIRMED")).toHaveCount(
      0,
    );
    await expect(detail.getByTestId("order-status-action-CANCELLED")).toHaveCount(
      0,
    );
    await expect(
      detail.getByTestId("counter-order-finalize-panel"),
    ).toHaveCount(0);
    await expect(detail.locator("dd").filter({ hasText: customerName })).toBeVisible();
    await expect(detail.getByText("Sem cebola E2E")).toBeVisible();
    await expect(detail.getByText("Produto E2E iFood")).toBeVisible();
    await expect(detail.getByText("Complemento E2E iFood")).toBeVisible();
    await expect(detail.getByText("Total").first()).toBeVisible();
    await expect(
      detail.getByRole("heading", { name: "Mensagem WhatsApp" }),
    ).toHaveCount(0);
  });

  test("after projection advances, awaiting clears and next iFood action shows", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-orders-ifood-await-advance@example.com",
    });
    const order = await createE2eIfoodOrder({
      customerName: uniqueCustomerName("Ifood Await Advance"),
      status: "PENDING",
      withProjectionLink: true,
    });

    const prisma = getPrisma();
    const ifoodOrder = await prisma.ifoodOrder.findFirstOrThrow({
      where: { operationalOrderId: order.id },
      select: { id: true, connectionId: true, storeId: true },
    });
    await prisma.ifoodOrderCommand.create({
      data: {
        connectionId: ifoodOrder.connectionId,
        storeId: ifoodOrder.storeId,
        ifoodOrderId: ifoodOrder.id,
        type: "CONFIRM",
        status: "ACCEPTED",
        correlationKey: `e2e-await-${order.id}`,
        acceptedAt: new Date(),
      },
    });

    await loginAsUser(page, manager);
    await page.goto(`/admin/pedidos/${order.id}`);
    const detail = page.getByTestId("admin-order-detail");
    await expect(detail.getByTestId("order-ifood-action-awaiting")).toBeVisible();
    await expect(detail.getByTestId("order-ifood-action-CONFIRM")).toHaveCount(0);

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CONFIRMED" },
    });
    await prisma.ifoodOrder.update({
      where: { id: ifoodOrder.id },
      data: { lastEventFullCode: "CONFIRMED" },
    });
    await prisma.ifoodOrderCommand.updateMany({
      where: { ifoodOrderId: ifoodOrder.id, type: "CONFIRM" },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });

    await page.reload();
    await expect(
      detail.getByTestId("order-ifood-action-START_PREPARATION"),
    ).toBeVisible();
    await expect(detail.getByTestId("order-ifood-action-awaiting")).toHaveCount(0);
  });

  test("KITCHEN sees prepare for CONFIRMED iFood but never confirm", async ({
    page,
  }) => {
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-orders-ifood-kitchen@example.com",
    });
    const pending = await createE2eIfoodOrder({
      customerName: uniqueCustomerName("Kitchen Ifood Pending"),
      status: "PENDING",
      withProjectionLink: true,
    });
    const confirmed = await createE2eIfoodOrder({
      customerName: uniqueCustomerName("Kitchen Ifood Confirmed"),
      status: "CONFIRMED",
      withProjectionLink: true,
    });

    await loginAsUser(page, kitchen);
    await page.goto(`/admin/pedidos/${pending.id}`);
    const pendingDetail = page.getByTestId("admin-order-detail");
    await expect(pendingDetail.getByTestId("order-ifood-status-note")).toBeVisible();
    await expect(pendingDetail.getByTestId("order-ifood-action-CONFIRM")).toHaveCount(
      0,
    );
    await expect(pendingDetail.getByTestId("order-ifood-action-denied")).toBeVisible();

    await page.goto(`/admin/pedidos/${confirmed.id}`);
    const confirmedDetail = page.getByTestId("admin-order-detail");
    await expect(
      confirmedDetail.getByTestId("order-ifood-action-START_PREPARATION"),
    ).toBeVisible();
    await expect(
      confirmedDetail.getByTestId("order-status-action-PREPARING"),
    ).toHaveCount(0);
  });
});
