import { expect, test } from "@playwright/test";
import {
  createE2eMenuCategory,
  createE2eMenuProduct,
  ensureOfficialStoreDisplayNameForE2e,
  ensurePilotMenuForE2e,
  getOfficialStoreDescriptionForE2e,
  getOfficialStoreIsOpenForE2e,
  getOfficialStoreMinimumOrderAmountCentsForE2e,
  setOfficialStoreDescriptionForE2e,
  setOfficialStoreIsOpenForE2e,
  setOfficialStoreMinimumOrderAmountCentsForE2e,
} from "./helpers/db";
import {
  addFirstProductToCart,
  addProductToCartByName,
  clearCartStorage,
} from "./helpers/menu";
import { CART_STORAGE_KEY, OFFICIAL_STORE_DISPLAY_NAME } from "./helpers/test-data";
import { PILOT_BURGER_PRODUCT_NAME } from "../../prisma/na-braza-pilot-menu";

/** Same pt-BR currency formatting used by the storefront `formatMoney`. */
function formatMoneyBr(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

test.describe("public menu", () => {
  test.beforeEach(async ({ page }) => {
    await ensureOfficialStoreDisplayNameForE2e();
    await ensurePilotMenuForE2e();
    await clearCartStorage(page);
  });

  test("loads hero and products", async ({ page }) => {
    await page.goto("/na-brasa");

    const hero = page.getByTestId("store-hero");
    await expect(hero).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
      OFFICIAL_STORE_DISPLAY_NAME,
    );
    await expect(page.getByTestId("menu-product-card").first()).toBeVisible();
  });

  test("hero eyebrow and title are tenant-aware", async ({ page }) => {
    await page.goto("/na-brasa");

    const hero = page.getByTestId("store-hero");
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
      OFFICIAL_STORE_DISPLAY_NAME,
    );
    await expect(page.getByTestId("store-hero-eyebrow")).toHaveText(
      "Cardápio online",
    );
    await expect(hero).not.toContainText("Cardápio online oficial do Na Braza");
    await expect(hero).not.toContainText(
      `Cardápio online de ${OFFICIAL_STORE_DISPLAY_NAME}`,
    );
    await expect(hero).not.toContainText(
      "Lanches artesanais e espetinhos na brasa",
    );
  });

  test("hero shows store description when configured", async ({ page }) => {
    const originalDescription = await getOfficialStoreDescriptionForE2e();
    const e2eDescription = `E2E Store Description ${Date.now()}`;

    try {
      await setOfficialStoreDescriptionForE2e(e2eDescription);
      await page.goto("/na-brasa");
      await expect(page.getByTestId("store-hero-description")).toHaveText(
        e2eDescription,
      );
    } finally {
      await setOfficialStoreDescriptionForE2e(originalDescription);
    }
  });

  for (const emptyDescription of [null, "", "   "] as const) {
    test(`hero shows generic description fallback when store description is ${JSON.stringify(emptyDescription)}`, async ({
      page,
    }) => {
      const originalDescription = await getOfficialStoreDescriptionForE2e();

      try {
        await setOfficialStoreDescriptionForE2e(emptyDescription);
        await page.goto("/na-brasa");
        await expect(page.getByTestId("store-hero-description")).toHaveText(
          "Escolha seus itens e faça seu pedido online.",
        );
        await expect(page.getByTestId("store-hero")).not.toContainText(
          "Lanches artesanais e espetinhos na brasa",
        );
      } finally {
        await setOfficialStoreDescriptionForE2e(originalDescription);
      }
    });
  }

  test("hero shows open status text when store is open", async ({ page }) => {
    const originalIsOpen = await getOfficialStoreIsOpenForE2e();

    try {
      await setOfficialStoreIsOpenForE2e(true);
      await page.goto("/na-brasa");
      await expect(page.getByTestId("store-status-badge")).toHaveText(
        "Aberto para pedidos",
      );
      await expect(page.getByTestId("store-open-notice")).toBeVisible();
      await expect(page.getByTestId("store-closed-notice")).toHaveCount(0);
    } finally {
      if (originalIsOpen !== null) {
        await setOfficialStoreIsOpenForE2e(originalIsOpen);
      }
    }
  });

  test("hero shows closed status text when store is closed", async ({
    page,
  }) => {
    const originalIsOpen = await getOfficialStoreIsOpenForE2e();

    try {
      await setOfficialStoreIsOpenForE2e(false);
      await page.goto("/na-brasa");
      await expect(page.getByTestId("store-status-badge")).toHaveText(
        "Fechado no momento",
      );
      await expect(page.getByTestId("store-closed-notice")).toBeVisible();
      await expect(page.getByTestId("store-open-notice")).toHaveCount(0);
      await expect(page.getByTestId("menu-product-card").first()).toBeVisible();
    } finally {
      if (originalIsOpen !== null) {
        await setOfficialStoreIsOpenForE2e(originalIsOpen);
      }
    }
  });

  test("adds product to cart, shows subtotal, preserves on reload, and opens checkout", async ({
    page,
  }) => {
    await addFirstProductToCart(page);

    const cartSummary = page.getByTestId("cart-summary");
    await expect(cartSummary).toBeVisible();
    await expect(page.getByTestId("cart-subtotal")).toBeVisible();
    await expect(page.getByText(/1 item/)).toBeVisible();

    const storedBeforeReload = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      CART_STORAGE_KEY,
    );
    expect(storedBeforeReload).toBeTruthy();

    await page.reload();
    await expect(page.getByTestId("cart-summary")).toBeVisible();
    await expect(page.getByText(/1 item/)).toBeVisible();

    await page.getByTestId("checkout-cta").click();
    await expect(page).toHaveURL(/\/na-brasa\/checkout/);
  });

  test("add-to-cart dialog traps focus, closes with Escape, and restores focus", async ({
    page,
  }) => {
    await page.goto("/na-brasa");
    await page.getByTestId("store-hero").waitFor();

    const productCard = page
      .getByTestId("menu-product-card")
      .filter({ hasText: PILOT_BURGER_PRODUCT_NAME })
      .first();
    const openButton = productCard.getByTestId("open-add-to-cart-button");
    await expect(openButton).toBeEnabled();
    await openButton.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByTestId("add-to-cart-dialog");
    await expect(dialog).toBeVisible();

    const closeButton = dialog.getByTestId("add-to-cart-close-button");
    const confirmButton = dialog.getByTestId("add-to-cart-button");

    const focusInsideDialog = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="add-to-cart-dialog"]');
      const active = document.activeElement;
      return Boolean(panel && active && panel.contains(active));
    });
    expect(focusInsideDialog).toBe(true);

    await closeButton.focus();
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(confirmButton).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(openButton).toBeFocused();
  });

  test("cart remove control exposes contextual accessible name", async ({
    page,
  }) => {
    await addFirstProductToCart(page);
    await expect(
      page.getByRole("button", { name: /Remover .+ do carrinho/ }).first(),
    ).toBeVisible();
  });

  test("product card renders local image with accessible alt and dimensions", async ({
    page,
  }) => {
    const productName = `E2E Image Product ${Date.now()}`;
    const category = await createE2eMenuCategory({
      name: `E2E Image Cat ${Date.now()}`,
    });
    await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: productName,
      imageUrl: "/vercel.svg",
    });

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: productName })
      .first();
    await expect(card).toBeVisible();

    const image = card.getByTestId("product-menu-thumbnail-image");
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("alt", productName);
    await expect(image).toHaveAttribute("width", "72");
    await expect(image).toHaveAttribute("height", "72");
    await expect(card.getByTestId("open-add-to-cart-button")).toBeEnabled();
  });

  test("product card without imageUrl shows generic fallback", async ({
    page,
  }) => {
    const productName = `E2E No Image Product ${Date.now()}`;
    const category = await createE2eMenuCategory({
      name: `E2E No Image Cat ${Date.now()}`,
    });
    await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: productName,
      imageUrl: null,
    });

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: productName })
      .first();
    await expect(card).toBeVisible();
    await expect(card.getByTestId("product-menu-thumbnail-fallback")).toBeVisible();
    await expect(card.getByTestId("product-menu-thumbnail-image")).toHaveCount(0);
    await expect(card).not.toContainText(/Na brasa/i);
    await expect(card).not.toContainText("Foto");
    await expect(card.getByRole("heading", { level: 3 })).toHaveText(productName);
    await expect(card.getByTestId("open-add-to-cart-button")).toBeEnabled();
  });

  test("product card rejects http remote imageUrl and shows fallback", async ({
    page,
  }) => {
    const productName = `E2E Http Url Product ${Date.now()}`;
    const category = await createE2eMenuCategory({
      name: `E2E Http Url Cat ${Date.now()}`,
    });
    await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: productName,
      imageUrl: "http://example.com/insecure.jpg",
    });

    let externalRequest = false;
    page.on("request", (request) => {
      if (request.url().includes("example.com")) {
        externalRequest = true;
      }
    });

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: productName })
      .first();
    await expect(card.getByTestId("product-menu-thumbnail-fallback")).toBeVisible();
    await expect(card.getByTestId("product-menu-thumbnail-image")).toHaveCount(0);
    expect(externalRequest).toBe(false);
  });

  test("product card rejects https remote imageUrl and shows fallback", async ({
    page,
  }) => {
    const productName = `E2E Https Url Product ${Date.now()}`;
    const category = await createE2eMenuCategory({
      name: `E2E Https Url Cat ${Date.now()}`,
    });
    await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: productName,
      imageUrl: "https://example.com/product.jpg",
    });

    let externalRequest = false;
    page.on("request", (request) => {
      if (request.url().includes("example.com")) {
        externalRequest = true;
      }
    });

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: productName })
      .first();
    await expect(card.getByTestId("product-menu-thumbnail-fallback")).toBeVisible();
    await expect(card.getByTestId("product-menu-thumbnail-image")).toHaveCount(0);
    expect(externalRequest).toBe(false);
  });

  test("product card rejects protocol-relative imageUrl and shows fallback", async ({
    page,
  }) => {
    const productName = `E2E Protocol Relative Product ${Date.now()}`;
    const category = await createE2eMenuCategory({
      name: `E2E Protocol Relative Cat ${Date.now()}`,
    });
    await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: productName,
      imageUrl: "//example.com/product.jpg",
    });

    let externalRequest = false;
    page.on("request", (request) => {
      if (request.url().includes("example.com")) {
        externalRequest = true;
      }
    });

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: productName })
      .first();
    await expect(card.getByTestId("product-menu-thumbnail-fallback")).toBeVisible();
    await expect(card.getByTestId("product-menu-thumbnail-image")).toHaveCount(0);
    expect(externalRequest).toBe(false);
  });

  // Falha de carga local (onError após abort/404): cobertura E2E com page.route().abort()
  // ficou instável neste ambiente (img permanece visível sem disparar fallback de forma confiável).
  // O componente mantém onError + naturalWidth === 0; recomenda-se teste unitário futuro
  // (ex.: @testing-library/react) para ProductMenuThumbnail.

  test.describe("cart minimum order indicator", () => {
    const PRODUCT_PRICE_CENTS = 2_000;
    const MINIMUM_ORDER_CENTS = 5_000;
    const remainingCents = MINIMUM_ORDER_CENTS - PRODUCT_PRICE_CENTS;
    const quantityToMeetMinimum = Math.ceil(
      MINIMUM_ORDER_CENTS / PRODUCT_PRICE_CENTS,
    );
    const expectedBelowMinimumMessage = `Faltam ${formatMoneyBr(remainingCents)} para atingir o pedido mínimo de ${formatMoneyBr(MINIMUM_ORDER_CENTS)}.`;

    let originalMinimumOrderAmountCents: number | null = null;
    let e2eProductName = "";

    test.beforeEach(async () => {
      originalMinimumOrderAmountCents =
        await getOfficialStoreMinimumOrderAmountCentsForE2e();
      await setOfficialStoreMinimumOrderAmountCentsForE2e(MINIMUM_ORDER_CENTS);

      const category = await createE2eMenuCategory({
        name: `E2E Menu Min Order Cat ${Date.now()}`,
      });
      const product = await createE2eMenuProduct({
        categoryId: category.id,
        storeId: category.storeId,
        name: `E2E Menu Min Order Product ${Date.now()}`,
        priceCents: PRODUCT_PRICE_CENTS,
      });
      e2eProductName = product.name;
    });

    test.afterEach(async () => {
      if (originalMinimumOrderAmountCents !== null) {
        await setOfficialStoreMinimumOrderAmountCentsForE2e(
          originalMinimumOrderAmountCents,
        );
      }
    });

    test("empty cart does not show minimum-order gap message", async ({
      page,
    }) => {
      await page.goto("/na-brasa");
      await expect(page.getByTestId("store-hero")).toBeVisible();
      await expect(page.getByTestId("cart-summary")).toHaveCount(0);
      await expect(page.getByTestId("cart-minimum-order-indicator")).toHaveCount(
        0,
      );
    });

    test("shows remaining amount when cart is below store minimum", async ({
      page,
    }) => {
      await addProductToCartByName(page, e2eProductName, { quantity: 1 });

      const indicator = page.getByTestId("cart-minimum-order-indicator");
      await expect(indicator).toBeVisible();
      await expect(indicator).toHaveText(expectedBelowMinimumMessage);
      await expect(page.getByTestId("checkout-cta")).toBeVisible();
    });

    test("shows reached message when cart meets store minimum", async ({
      page,
    }) => {
      await addProductToCartByName(page, e2eProductName, {
        quantity: quantityToMeetMinimum,
      });

      const indicator = page.getByTestId("cart-minimum-order-indicator");
      await expect(indicator).toBeVisible();
      await expect(indicator).toHaveText("Pedido mínimo atingido.");
    });

    test("keeps minimum-order message correct after reload", async ({ page }) => {
      await addProductToCartByName(page, e2eProductName, { quantity: 1 });

      await expect(page.getByTestId("cart-minimum-order-indicator")).toHaveText(
        expectedBelowMinimumMessage,
      );

      await page.reload();
      await expect(page.getByTestId("cart-summary")).toBeVisible();
      await expect(page.getByTestId("cart-subtotal")).toBeVisible();
      await expect(page.getByTestId("cart-minimum-order-indicator")).toHaveText(
        expectedBelowMinimumMessage,
      );
    });

    test("hides indicator when store has no minimum order", async ({ page }) => {
      // Schema field is Int (non-null); 0 means no minimum in app logic.
      await setOfficialStoreMinimumOrderAmountCentsForE2e(0);

      await addProductToCartByName(page, e2eProductName, { quantity: 1 });

      await expect(page.getByTestId("cart-summary")).toBeVisible();
      await expect(page.getByTestId("cart-minimum-order-indicator")).toHaveCount(
        0,
      );
    });
  });
});
