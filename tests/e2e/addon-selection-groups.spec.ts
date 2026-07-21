import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import { ensureE2eStoreUser } from "./helpers/e2e-admin-user";
import { focusAdminMenuCategory } from "./helpers/admin-menu-ui";
import {
  cleanupE2eAddons,
  cleanupE2eMenuCatalog,
  disconnectE2ePrisma,
  ensurePilotMenuForE2e,
} from "./helpers/db";
import { clearCartStorage } from "./helpers/menu";
import { createOrder } from "@/features/orders/services/create-order.service";
import { e2ePhone, getStoreSlug, uniqueCustomerName } from "./helpers/test-data";
import { PrismaClient } from "@prisma/client";

test.describe("addon selection groups", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterAll(async () => {
    await cleanupE2eAddons();
    await cleanupE2eMenuCatalog();
    await disconnectE2ePrisma();
  });

  test.beforeEach(async ({ page }) => {
    await clearCartStorage(page);
    await ensurePilotMenuForE2e();
  });

  test("public UI uses radio for cheese group and server rejects both cheeses", async ({
    page,
  }) => {
    const prisma = new PrismaClient();
    const burger = await prisma.product.findFirstOrThrow({
      where: { store: { slug: "na-brasa" }, name: "Pão Carne Queijo" },
      select: {
        id: true,
        addonGroups: {
          where: { name: "Escolha o queijo extra", active: true },
          select: {
            id: true,
            options: {
              select: {
                addon: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    const group = burger.addonGroups[0];
    expect(group).toBeTruthy();
    const cheddar = group!.options.find((option) =>
      option.addon.name.includes("Cheddar"),
    )?.addon;
    const prato = group!.options.find((option) =>
      option.addon.name.includes("prato"),
    )?.addon;
    expect(cheddar).toBeTruthy();
    expect(prato).toBeTruthy();
    await prisma.$disconnect();

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: "Pão Carne Queijo" });
    await card.getByTestId("open-add-to-cart-button").click();
    await expect(page.getByTestId(`menu-addon-group-${group!.id}`)).toBeVisible();
    await page.getByTestId(`menu-addon-option-${cheddar!.id}`).check();
    await page.getByTestId(`menu-addon-option-${prato!.id}`).check();
    await expect(page.getByTestId(`menu-addon-option-${cheddar!.id}`)).not.toBeChecked();
    await expect(page.getByTestId(`menu-addon-option-${prato!.id}`)).toBeChecked();

    const rejected = await createOrder({
      storeSlug: getStoreSlug(),
      customerName: uniqueCustomerName("Cheese Both"),
      customerPhone: e2ePhone,
      deliveryType: "PICKUP",
      paymentMethod: "PIX",
      items: [
        {
          productId: burger.id,
          quantity: 1,
          addonIds: [cheddar!.id, prato!.id],
        },
      ],
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.message).toMatch(/máximo 1/i);
    }
  });

  test("MANAGER can open product editor and see addon groups panel", async ({
    page,
  }) => {
    const manager = await ensureE2eStoreUser({
      role: "MANAGER",
      email: "e2e-store-manager-addon-groups@example.com",
    });
    const prisma = new PrismaClient();
    const burger = await prisma.product.findFirstOrThrow({
      where: { store: { slug: "na-brasa" }, name: "Pão Carne Queijo" },
      select: { id: true, categoryId: true },
    });
    await prisma.$disconnect();

    await loginAsUser(page, manager);
    await page.goto("/admin/cardapio");
    await focusAdminMenuCategory(page, burger.categoryId);
    await page.getByTestId(`admin-menu-edit-product-${burger.id}`).click();
    await expect(
      page.getByTestId(`admin-product-addon-groups-${burger.id}`),
    ).toBeVisible();
  });
});
