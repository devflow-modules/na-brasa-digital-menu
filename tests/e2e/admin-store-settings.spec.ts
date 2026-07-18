import { expect, test } from "@playwright/test";
import { createOrder } from "@/features/orders/services/create-order.service";
import { loginAsUser } from "./helpers/auth";
import {
  attemptToggleStoreOpen,
  attemptUpdateStoreSettings,
  captureE2eStoreSettings,
  restoreE2eStoreSettings,
  type E2eStoreSettingsSnapshot,
} from "./helpers/admin-store-settings-service";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import {
  cleanupE2eOrders,
  cleanupE2eStoreUsers,
  disconnectE2ePrisma,
  ensureE2eStore,
  ensurePilotMenuForE2e,
  getPrisma,
} from "./helpers/db";
import { addFirstProductToCart, clearCartStorage } from "./helpers/menu";
import { e2ePhone, getStoreSlug, uniqueCustomerName } from "./helpers/test-data";
import { PILOT_BURGER_PRODUCT_NAME } from "../../prisma/na-braza-pilot-menu";

const E2E_ADDRESS_MARKER = "E2E Settings Address";
const E2E_HOURS_MARKER = "E2E Horário 10h–22h";
const E2E_WHATSAPP = "5599988776655";

test.describe("admin store settings", () => {
  let baseline: E2eStoreSettingsSnapshot & { storeId: string };

  test.beforeAll(async () => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
    await ensurePilotMenuForE2e();
    baseline = await captureE2eStoreSettings(getStoreSlug());
  });

  test.afterEach(async () => {
    await restoreE2eStoreSettings(baseline.storeId, baseline);
  });

  test.afterAll(async () => {
    await restoreE2eStoreSettings(baseline.storeId, baseline);
    await cleanupE2eOrders();
    await cleanupE2eStoreUsers();
    await disconnectE2ePrisma();
  });

  test("MANAGER opens /admin/configuracoes and edits address, fee, and hours", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-settings-manager@example.com",
    });

    await loginAsUser(page, manager);
    await page.goto("/admin/configuracoes");
    await expect(page.getByTestId("admin-store-settings-page")).toBeVisible();
    await expect(page.getByTestId("admin-store-settings-form")).toBeVisible();
    await expect(page.getByTestId("admin-store-settings-save")).toBeVisible();

    await page.getByLabel("Endereço").fill(E2E_ADDRESS_MARKER);
    await page.getByLabel("Horário / funcionamento").fill(E2E_HOURS_MARKER);
    await page.getByLabel("Taxa de entrega (R$)").fill("12,50");
    await page.getByTestId("admin-store-settings-save").click();
    await expect(page.getByText("Configurações salvas.")).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/na-brasa");
    await expect(page.getByTestId("store-address")).toContainText(
      E2E_ADDRESS_MARKER,
    );
    await expect(page.getByTestId("store-opening-hours")).toContainText(
      E2E_HOURS_MARKER,
    );
    await expect(page.getByText("Taxa de entrega: R$ 12,50")).toBeVisible();
  });

  test("OPERATOR sees read-only structural form and can toggle open/closed", async ({
    page,
  }) => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-store-settings-operator@example.com",
    });

    await loginAsUser(page, operator);
    await page.goto("/admin/configuracoes");
    await expect(page.getByTestId("admin-store-open-toggle")).toBeVisible();
    await expect(page.getByTestId("admin-store-settings-save")).toHaveCount(0);

    const denied = await attemptUpdateStoreSettings({
      input: {
        whatsapp: baseline.whatsapp,
        address: "Hacked",
        deliveryFeeCents: "0",
        minimumOrderAmountCents: "0",
        pickupEnabled: true,
        deliveryEnabled: true,
        isOpen: true,
      },
      storeId: operator.storeId!,
      role: "OPERATOR",
    });
    expect(denied.ok).toBe(false);

    await page.getByTestId("admin-store-open-toggle-button").click();
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByTestId("admin-store-open-status")).toContainText(
      /fechada/i,
    );
  });

  test("KITCHEN only views settings (no save, no toggle)", async ({ page }) => {
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-store-settings-kitchen@example.com",
    });

    await loginAsUser(page, kitchen);
    await page.goto("/admin/configuracoes");
    await expect(page.getByTestId("admin-store-settings-page")).toBeVisible();
    await expect(page.getByTestId("admin-store-settings-save")).toHaveCount(0);
    await expect(page.getByTestId("admin-store-open-toggle-button")).toHaveCount(
      0,
    );
    await expect(page.getByTestId("admin-store-open-status")).toBeVisible();
  });

  test("closed store blocks checkout CTA and server-side order creation", async ({
    page,
  }) => {
    const prisma = getPrisma();
    await prisma.store.update({
      where: { id: baseline.storeId },
      data: { isOpen: false },
    });

    await clearCartStorage(page);
    await addFirstProductToCart(page);
    await expect(page.getByTestId("checkout-cta-closed")).toBeVisible();
    await expect(page.getByTestId("checkout-cta")).toHaveCount(0);

    const product = await prisma.product.findFirst({
      where: { storeId: baseline.storeId, active: true },
      select: { id: true },
    });
    expect(product).toBeTruthy();

    const denied = await createOrder({
      storeSlug: getStoreSlug(),
      customerName: uniqueCustomerName("Closed Store"),
      customerPhone: e2ePhone,
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      items: [{ productId: product!.id, quantity: 1, addonIds: [] }],
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.message).toBe("A loja está fechada no momento.");
    }
  });

  test("deliveryEnabled=false blocks DELIVERY orders server-side", async () => {
    const prisma = getPrisma();
    await prisma.store.update({
      where: { id: baseline.storeId },
      data: { deliveryEnabled: false, pickupEnabled: true, isOpen: true },
    });

    const product = await prisma.product.findFirst({
      where: { storeId: baseline.storeId, active: true },
      select: { id: true },
    });
    expect(product).toBeTruthy();

    const denied = await createOrder({
      storeSlug: getStoreSlug(),
      customerName: uniqueCustomerName("No Delivery"),
      customerPhone: e2ePhone,
      deliveryType: "DELIVERY",
      deliveryAddress: "Rua E2E, 1",
      paymentMethod: "PIX",
      items: [{ productId: product!.id, quantity: 1, addonIds: [] }],
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.message).toBe("Entrega indisponível no momento.");
    }
  });

  test("pickupEnabled=false blocks PICKUP orders server-side", async () => {
    const prisma = getPrisma();
    await prisma.store.update({
      where: { id: baseline.storeId },
      data: { pickupEnabled: false, deliveryEnabled: true, isOpen: true },
    });

    const product = await prisma.product.findFirst({
      where: { storeId: baseline.storeId, active: true },
      select: { id: true },
    });
    expect(product).toBeTruthy();

    const denied = await createOrder({
      storeSlug: getStoreSlug(),
      customerName: uniqueCustomerName("No Pickup"),
      customerPhone: e2ePhone,
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      items: [{ productId: product!.id, quantity: 1, addonIds: [] }],
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.message).toBe("Retirada indisponível no momento.");
    }
  });

  test("store A settings changes do not alter store B", async ({ page }) => {
    const storeB = await ensureE2eStore({ slug: "e2e-settings-loja-b" });
    const storeBBefore = await captureE2eStoreSettings(storeB.slug);

    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-settings-scope@example.com",
      storeSlug: getStoreSlug(),
    });

    await loginAsUser(page, manager);
    await page.goto("/admin/configuracoes");
    await page.getByLabel("Endereço").fill(`${E2E_ADDRESS_MARKER} Store A`);
    await page.getByTestId("admin-store-settings-save").click();
    await expect(page.getByText("Configurações salvas.")).toBeVisible({
      timeout: 15_000,
    });

    const storeBAfter = await captureE2eStoreSettings(storeB.slug);
    expect(storeBAfter.address).toBe(storeBBefore.address);
    expect(storeBAfter.whatsapp).toBe(storeBBefore.whatsapp);
    expect(storeBAfter.deliveryFeeCents).toBe(storeBBefore.deliveryFeeCents);
    expect(storeBAfter.minimumOrderAmountCents).toBe(
      storeBBefore.minimumOrderAmountCents,
    );

    await restoreE2eStoreSettings(storeB.id, storeBBefore);
  });

  test("MANAGER updates delivery minimum and public hero reflects it", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-settings-minimum@example.com",
    });

    await loginAsUser(page, manager);
    await page.goto("/admin/configuracoes");

    await page.getByRole("checkbox", { name: /Entrega habilitada/i }).check();
    await page.getByRole("checkbox", { name: /Retirada habilitada/i }).check();
    await page
      .getByTestId("admin-store-minimum-order-input")
      .fill("50,00");
    await page.getByTestId("admin-store-settings-save").click();
    await expect(page.getByTestId("admin-store-settings-success")).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/na-brasa");
    await expect(page.getByTestId("store-minimum-order")).toContainText(
      "R$ 50,00",
    );

    const prisma = getPrisma();
    const store = await prisma.store.findUnique({
      where: { id: baseline.storeId },
      select: { minimumOrderAmountCents: true },
    });
    expect(store?.minimumOrderAmountCents).toBe(5_000);
  });

  test("rejects saving with both modalities disabled", async ({ page }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-settings-modality@example.com",
    });

    await loginAsUser(page, manager);
    await page.goto("/admin/configuracoes");

    await page.getByRole("checkbox", { name: /Retirada habilitada/i }).uncheck();
    await page.getByRole("checkbox", { name: /Entrega habilitada/i }).uncheck();

    await expect(
      page.getByTestId("admin-store-settings-modality-error"),
    ).toContainText(/pelo menos uma modalidade/i);
    await expect(page.getByTestId("admin-store-settings-save")).toBeDisabled();

    const denied = await attemptUpdateStoreSettings({
      input: {
        whatsapp: baseline.whatsapp,
        address: baseline.address ?? "",
        openingHours: baseline.openingHours ?? "",
        deliveryFeeCents: String(baseline.deliveryFeeCents / 100).replace(
          ".",
          ",",
        ),
        minimumOrderAmountCents: String(
          baseline.minimumOrderAmountCents / 100,
        ).replace(".", ","),
        pickupEnabled: false,
        deliveryEnabled: false,
        isOpen: baseline.isOpen,
      },
      storeId: baseline.storeId,
      role: "MANAGER",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.message).toMatch(/pelo menos uma modalidade/i);
    }

    const prisma = getPrisma();
    const store = await prisma.store.findUnique({
      where: { id: baseline.storeId },
      select: { pickupEnabled: true, deliveryEnabled: true },
    });
    expect(store?.pickupEnabled).toBe(baseline.pickupEnabled);
    expect(store?.deliveryEnabled).toBe(baseline.deliveryEnabled);
  });

  test("updated WhatsApp is used in order wa.me link", async () => {
    const prisma = getPrisma();
    await prisma.store.update({
      where: { id: baseline.storeId },
      data: { whatsapp: E2E_WHATSAPP, isOpen: true },
    });

    const product = await prisma.product.findFirst({
      where: {
        storeId: baseline.storeId,
        active: true,
        name: PILOT_BURGER_PRODUCT_NAME,
      },
      select: { id: true },
    });
    expect(product).toBeTruthy();

    const created = await createOrder({
      storeSlug: getStoreSlug(),
      customerName: uniqueCustomerName("WhatsApp Settings"),
      customerPhone: e2ePhone,
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      items: [{ productId: product!.id, quantity: 2, addonIds: [] }],
    });
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.whatsappUrl).toContain(E2E_WHATSAPP);
    }
  });

  test("OPERATOR can toggle via service; KITCHEN cannot", async () => {
    const operator = await ensureE2eStoreUser({
      role: "OPERATOR",
      email: "e2e-store-settings-toggle-op@example.com",
    });
    const kitchen = await ensureE2eStoreUser({
      role: "KITCHEN",
      email: "e2e-store-settings-toggle-k@example.com",
    });

    const toggled = await attemptToggleStoreOpen({
      isOpen: false,
      storeId: operator.storeId!,
      role: "OPERATOR",
    });
    expect(toggled.ok).toBe(true);

    const denied = await attemptToggleStoreOpen({
      isOpen: true,
      storeId: kitchen.storeId!,
      role: "KITCHEN",
    });
    expect(denied.ok).toBe(false);
  });
});
