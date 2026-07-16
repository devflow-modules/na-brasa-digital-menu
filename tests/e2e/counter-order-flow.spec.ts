import { expect, test, type Page } from "@playwright/test";
import { attemptFinalizeCounterOrder } from "./helpers/admin-finalize-service";
import { attemptOrderStatusUpdate } from "./helpers/admin-status-service";
import { loginAsUser } from "./helpers/auth";
import { seedCounterOrderE2eCatalog } from "./helpers/counter-order-catalog";
import {
  cleanupE2eAddons,
  cleanupE2eMenuCatalog,
  cleanupE2eOrders,
  cleanupE2eStores,
  createE2eCounterOrder,
  createE2ePickupOrder,
  disconnectE2ePrisma,
  ensureE2eStore,
  findLatestOrderByCustomerName,
  getOrderPaymentSnapshot,
  getOrderStatus,
  getPrisma,
} from "./helpers/db";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import { getStoreSlug, uniqueCustomerName } from "./helpers/test-data";

async function advancePickupToReady(page: Page): Promise<void> {
  await page.getByTestId("order-status-action-CONFIRMED").click();
  await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
    "data-status",
    "CONFIRMED",
    { timeout: 15_000 },
  );

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
}

test.describe("counter order operational flow", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eOrders();
    await cleanupE2eAddons();
    await cleanupE2eMenuCatalog();
    await cleanupE2eStores();
    await disconnectE2ePrisma();
  });

  test("OPERATOR creates COUNTER, advances to READY, receives CASH and completes", async ({
    page,
  }) => {
    const catalog = await seedCounterOrderE2eCatalog({
      suffix: `main-${Date.now()}`,
    });
    const customerLabel = uniqueCustomerName("Balcao Operator");
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-counter-operator-main@example.com",
    });

    await loginAsUser(page, operator);
    await expect(page.getByTestId("admin-counter-nav-link")).toBeVisible();
    await page.getByTestId("admin-counter-nav-link").click();
    await expect(page.getByTestId("admin-counter-order-page")).toBeVisible();

    await page
      .getByTestId(`counter-order-product-${catalog.plainProduct.id}`)
      .click();

    await page
      .getByTestId(`counter-order-product-${catalog.addonProduct.id}`)
      .click();
    await expect(page.getByTestId("counter-order-item-editor")).toBeVisible();
    await page.getByTestId(`counter-order-addon-${catalog.addon.id}`).click();
    await page.getByTestId("counter-order-item-notes").fill("sem cebola");
    await page.getByTestId("counter-order-item-confirm").click();

    await page.getByTestId("counter-order-open-review").click();
    await expect(page.getByTestId("counter-order-review")).toBeVisible();
    await page.getByTestId("counter-order-customer-label").fill(customerLabel);
    await page.getByTestId("counter-order-submit").click();

    await expect(page.getByTestId("counter-order-success")).toBeVisible({
      timeout: 15_000,
    });

    const createdOrder = await findLatestOrderByCustomerName(customerLabel);
    expect(createdOrder).not.toBeNull();
    if (!createdOrder) {
      return;
    }

    await page
      .getByTestId("counter-order-success")
      .getByRole("link", { name: "Ver pedido" })
      .click();

    await expect(page.getByTestId("admin-order-detail")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/admin/pedidos/${createdOrder.id}`));
    await expect(page.getByText("Balcão").first()).toBeVisible();
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "PENDING",
    );

    const created = await getOrderPaymentSnapshot(createdOrder.id);
    expect(created.source).toBe("COUNTER");
    expect(created.status).toBe("PENDING");
    expect(created.customerName).toBe(customerLabel);
    expect(created.createdByUserId).toBe(operator.userId);
    expect(created.storeId).toBe(catalog.storeId);
    expect(created.paymentMethod).toBeNull();
    expect(created.paidAt).toBeNull();

    const persistedLines = await getPrisma().orderItem.findMany({
      where: { orderId: created.id },
      include: { addons: true },
      orderBy: { createdAt: "asc" },
    });
    expect(persistedLines).toHaveLength(2);
    expect(
      persistedLines.some((line) => line.productId === catalog.plainProduct.id),
    ).toBe(true);
    const addonLine = persistedLines.find(
      (line) => line.productId === catalog.addonProduct.id,
    );
    expect(addonLine?.addons.map((addon) => addon.addonId)).toContain(
      catalog.addon.id,
    );
    expect(addonLine?.notes).toBe("sem cebola");

    await advancePickupToReady(page);
    expect(await getOrderStatus(created.id)).toBe("READY");

    await expect(
      page.getByTestId("order-status-action-COMPLETED"),
    ).toHaveCount(0);
    await expect(page.getByTestId("counter-order-receive-cta")).toBeVisible();

    const bypass = await attemptOrderStatusUpdate({
      orderId: created.id,
      nextStatus: "COMPLETED",
      storeId: catalog.storeId,
      role: "OPERATOR",
    });
    expect(bypass.ok).toBe(false);
    if (!bypass.ok) {
      expect(bypass.message).toMatch(/Receber e finalizar/i);
    }
    expect(await getOrderStatus(created.id)).toBe("READY");

    await page.getByTestId("counter-order-receive-cta").click();
    await expect(page.getByTestId("receive-and-finalize-dialog")).toBeVisible();
    await page.getByTestId("receive-payment-CASH").click();

    const totalText = await page
      .getByTestId("receive-finalize-total")
      .innerText();
    expect(totalText).toMatch(/R\$/);

    const snapshotBeforePay = await getOrderPaymentSnapshot(created.id);
    const tenderedCents = snapshotBeforePay.totalCents + 800;
    const tenderedReais = (tenderedCents / 100).toFixed(2).replace(".", ",");
    await page.getByTestId("receive-tendered-input").fill(tenderedReais);
    await expect(page.getByTestId("receive-change-preview")).toContainText(
      "8,00",
    );

    await page.getByTestId("receive-finalize-confirm").click();
    await expect(page.getByTestId("receive-and-finalize-dialog")).toHaveCount(
      0,
      { timeout: 15_000 },
    );
    // After refresh the receive panel unmounts; assert durable UI + DB state.
    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "COMPLETED",
      { timeout: 15_000 },
    );
    await expect(page.getByTestId("counter-order-receive-cta")).toHaveCount(0);
    await expect(page.getByTestId("order-paid-at")).toBeVisible();
    await expect(page.getByTestId("order-cash-tender")).toContainText("troco");

    const paid = await getOrderPaymentSnapshot(created.id);
    expect(paid.status).toBe("COMPLETED");
    expect(paid.paymentMethod).toBe("CASH");
    expect(paid.paidAt).not.toBeNull();
    expect(paid.changeForCents).toBe(tenderedCents);
  });

  test("COUNTER READY can be finalized with PIX without change", async ({
    page,
  }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-counter-operator-pix@example.com",
    });
    const order = await createE2eCounterOrder({
      customerName: uniqueCustomerName("Balcao Pix"),
      status: "READY",
      createdByUserId: operator.userId,
      totalCents: 2500,
    });

    await loginAsUser(page, operator);
    await page.goto(`/admin/pedidos/${order.id}`);
    await expect(page.getByTestId("counter-order-receive-cta")).toBeVisible();

    await page.getByTestId("counter-order-receive-cta").click();
    await page.getByTestId("receive-payment-PIX").click();
    await expect(page.getByTestId("receive-tendered-input")).toHaveCount(0);
    await page.getByTestId("receive-finalize-confirm").click();

    await expect(page.getByTestId("order-status-badge")).toHaveAttribute(
      "data-status",
      "COMPLETED",
      { timeout: 15_000 },
    );

    const paid = await getOrderPaymentSnapshot(order.id);
    expect(paid.status).toBe("COMPLETED");
    expect(paid.paymentMethod).toBe("PIX");
    expect(paid.changeForCents).toBeNull();
    expect(paid.paidAt).not.toBeNull();
  });

  test("KITCHEN cannot access balcao and cannot finalize", async ({ page }) => {
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-counter-kitchen@example.com",
    });
    const order = await createE2eCounterOrder({
      customerName: uniqueCustomerName("Balcao Kitchen Block"),
      status: "READY",
    });

    await loginAsUser(page, kitchen);
    await expect(page.getByTestId("admin-counter-nav-link")).toHaveCount(0);

    const balcao = await page.goto("/admin/balcao");
    expect(balcao?.status()).toBe(404);
    await expect(page.getByTestId("admin-counter-order-page")).toHaveCount(0);

    await page.goto(`/admin/pedidos/${order.id}`);
    await expect(page.getByTestId("counter-order-receive-cta")).toHaveCount(0);

    const finalize = await attemptFinalizeCounterOrder({
      orderId: order.id,
      storeId: kitchen.storeId!,
      role: "KITCHEN",
      paymentMethod: "PIX",
    });
    expect(finalize.ok).toBe(false);

    const snapshot = await getOrderPaymentSnapshot(order.id);
    expect(snapshot.status).toBe("READY");
    expect(snapshot.paidAt).toBeNull();
  });

  test("other store cannot open COUNTER order detail", async ({ page }) => {
    const storeASlug = getStoreSlug();
    const storeB = await ensureE2eStore({ slug: "e2e-counter-outra-loja" });
    const orderA = await createE2eCounterOrder({
      customerName: uniqueCustomerName("Balcao Tenant A"),
      storeSlug: storeASlug,
      status: "READY",
    });

    const operatorB = await ensureE2eStoreUser({
      role: "OPERATOR",
      storeSlug: storeB.slug,
      email: "e2e-counter-operator-b@example.com",
    });

    await loginAsUser(page, operatorB);
    await expect(page.getByText(orderA.customerName)).toHaveCount(0);

    const foreign = await page.goto(`/admin/pedidos/${orderA.id}`);
    expect(foreign?.status()).toBe(404);

    const crossTenantFinalize = await attemptFinalizeCounterOrder({
      orderId: orderA.id,
      storeId: storeB.id,
      role: "OPERATOR",
      paymentMethod: "PIX",
    });
    expect(crossTenantFinalize.ok).toBe(false);

    const snapshot = await getOrderPaymentSnapshot(orderA.id);
    expect(snapshot.status).toBe("READY");
    expect(snapshot.paidAt).toBeNull();
    expect(snapshot.storeId).not.toBe(storeB.id);
  });

  test("cash below total is blocked and order stays READY unpaid", async ({
    page,
  }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-counter-operator-cash-low@example.com",
    });
    const order = await createE2eCounterOrder({
      customerName: uniqueCustomerName("Balcao Cash Low"),
      status: "READY",
      createdByUserId: operator.userId,
      totalCents: 4200,
    });

    await loginAsUser(page, operator);
    await page.goto(`/admin/pedidos/${order.id}`);
    await page.getByTestId("counter-order-receive-cta").click();
    await page.getByTestId("receive-payment-CASH").click();
    await page.getByTestId("receive-tendered-input").fill("10,00");

    await expect(page.getByTestId("receive-finalize-confirm")).toBeDisabled();
    await expect(page.getByTestId("receive-change-preview")).toHaveText("—");

    const snapshot = await getOrderPaymentSnapshot(order.id);
    expect(snapshot.status).toBe("READY");
    expect(snapshot.paidAt).toBeNull();
    expect(snapshot.paymentMethod).toBeNull();
    expect(snapshot.changeForCents).toBeNull();
  });

  test("second finalization is blocked and preserves original payment", async () => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-counter-operator-dup@example.com",
    });
    const order = await createE2eCounterOrder({
      customerName: uniqueCustomerName("Balcao Dup Finalize"),
      status: "READY",
      createdByUserId: operator.userId,
      totalCents: 3000,
    });

    const first = await attemptFinalizeCounterOrder({
      orderId: order.id,
      storeId: operator.storeId!,
      role: "OPERATOR",
      paymentMethod: "CARD",
    });
    expect(first.ok).toBe(true);

    const afterFirst = await getOrderPaymentSnapshot(order.id);
    expect(afterFirst.paymentMethod).toBe("CARD");
    expect(afterFirst.paidAt).not.toBeNull();
    const paidAtFirst = afterFirst.paidAt!.toISOString();

    const second = await attemptFinalizeCounterOrder({
      orderId: order.id,
      storeId: operator.storeId!,
      role: "OPERATOR",
      paymentMethod: "PIX",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.message).toMatch(/já foi finalizado/i);
    }

    const afterSecond = await getOrderPaymentSnapshot(order.id);
    expect(afterSecond.status).toBe("COMPLETED");
    expect(afterSecond.paymentMethod).toBe("CARD");
    expect(afterSecond.paidAt?.toISOString()).toBe(paidAtFirst);
    expect(afterSecond.changeForCents).toBeNull();
  });

  test("concurrent finalizations keep a single winner payment", async () => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-counter-operator-race@example.com",
    });
    const order = await createE2eCounterOrder({
      customerName: uniqueCustomerName("Balcao Race"),
      status: "READY",
      createdByUserId: operator.userId,
      totalCents: 3100,
    });

    const settled = await Promise.allSettled([
      attemptFinalizeCounterOrder({
        orderId: order.id,
        storeId: operator.storeId!,
        role: "OPERATOR",
        paymentMethod: "PIX",
      }),
      attemptFinalizeCounterOrder({
        orderId: order.id,
        storeId: operator.storeId!,
        role: "OPERATOR",
        paymentMethod: "CARD",
      }),
    ]);

    const results = settled.map((entry) => {
      expect(entry.status).toBe("fulfilled");
      return entry.status === "fulfilled" ? entry.value : null;
    });
    const oks = results.filter((result) => result?.ok);
    const fails = results.filter((result) => result && !result.ok);
    expect(oks).toHaveLength(1);
    expect(fails).toHaveLength(1);
    if (!fails[0]?.ok) {
      expect(fails[0]?.message).toMatch(/já foi finalizado|pronto para recebimento/i);
    }

    const snapshot = await getOrderPaymentSnapshot(order.id);
    expect(snapshot.status).toBe("COMPLETED");
    expect(snapshot.paidAt).not.toBeNull();
    expect(snapshot.changeForCents).toBeNull();
    expect(["PIX", "CARD"]).toContain(snapshot.paymentMethod);
    const winner = oks[0];
    if (winner?.ok) {
      expect(snapshot.paymentMethod).toBe(winner.paymentMethod);
      expect(snapshot.paidAt?.toISOString()).toBe(winner.paidAt);
    }
  });

  test("DIRECT READY keeps generic complete CTA and no receive panel", async ({
    page,
  }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-counter-operator-direct@example.com",
    });
    const order = await createE2ePickupOrder({
      customerName: uniqueCustomerName("Direct Regression"),
      status: "READY",
    });

    await loginAsUser(page, operator);
    await page.goto(`/admin/pedidos/${order.id}`);

    await expect(page.getByTestId("counter-order-receive-cta")).toHaveCount(0);
    await expect(page.getByTestId("order-status-action-COMPLETED")).toBeVisible();
    await expect(page.getByTestId("order-paid-at")).toHaveCount(0);

    const snapshot = await getOrderPaymentSnapshot(order.id);
    expect(snapshot.source).toBe("DIRECT");
    expect(snapshot.paidAt).toBeNull();
    expect(snapshot.paymentMethod).toBe("PIX");
  });
});
