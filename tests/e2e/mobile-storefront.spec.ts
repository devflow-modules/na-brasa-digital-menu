import { expect, test } from "@playwright/test";
import {
  createE2eMenuCategory,
  createE2eMenuProduct,
  ensureOfficialStoreDisplayNameForE2e,
  ensurePilotMenuForE2e,
  getOfficialStoreIsOpenForE2e,
  getOfficialStoreMinimumOrderAmountCentsForE2e,
  setOfficialStoreIsOpenForE2e,
  setOfficialStoreMinimumOrderAmountCentsForE2e,
} from "./helpers/db";
import { clearCartStorage } from "./helpers/menu";
import {
  e2ePhone,
  OFFICIAL_STORE_DISPLAY_NAME,
} from "./helpers/test-data";

const PRODUCT_PRICE_CENTS = 2_000;
const MINIMUM_ORDER_CENTS = 5_000;

type Box = { x: number; y: number; width: number; height: number };

function boxesOverlapVertically(a: Box, b: Box): boolean {
  return a.y < b.y + b.height && b.y < a.y + a.height;
}

function formatMoneyBr(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
): Promise<void> {
  const overflowPx = await page.evaluate(() => {
    return (
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
    );
  });
  // Small tolerance for sub-pixel rounding / mobile chrome chrome insets.
  expect(overflowPx).toBeLessThanOrEqual(1);
}

test.describe("mobile storefront", () => {
  test.beforeEach(async ({ page }) => {
    await ensureOfficialStoreDisplayNameForE2e();
    await ensurePilotMenuForE2e();
    await clearCartStorage(page);
  });

  test("loads menu without horizontal overflow", async ({ page }) => {
    await page.goto("/na-brasa");

    await expect(page.getByTestId("store-hero")).toBeVisible();
    await expect(
      page.getByTestId("store-hero").getByRole("heading", { level: 1 }),
    ).toHaveText(OFFICIAL_STORE_DISPLAY_NAME);
    await expect(page.getByTestId("menu-catalog-heading")).toBeVisible();
    await expect(page.getByTestId("menu-product-card").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("opens and closes add-to-cart dialog with touch controls", async ({
    page,
  }) => {
    const stamp = Date.now();
    const productName = `E2E Menu Mobile Dialog Product ${stamp}`;
    const category = await createE2eMenuCategory({
      name: `E2E Menu Mobile Dialog Cat ${stamp}`,
    });
    await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: productName,
      priceCents: PRODUCT_PRICE_CENTS,
    });

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: productName });
    await card.getByTestId("open-add-to-cart-button").click();

    const dialog = page.getByTestId("add-to-cart-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("add-to-cart-close-button")).toBeVisible();
    await expect(dialog.getByTestId("add-to-cart-button")).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    const viewport = page.viewportSize();
    expect(dialogBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (dialogBox && viewport) {
      expect(dialogBox.width).toBeLessThanOrEqual(viewport.width + 1);
    }

    await dialog.getByTestId("add-to-cart-close-button").click();
    await expect(dialog).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("adds item, shows cart and minimum-order indicator, persists, and opens checkout", async ({
    page,
  }) => {
    const stamp = Date.now();
    const productName = `E2E Menu Mobile Cart Product ${stamp}`;
    const expectedDeliveryMinimum = `Pedido mínimo para entrega: ${formatMoneyBr(MINIMUM_ORDER_CENTS)}`;

    const originalMinimum =
      await getOfficialStoreMinimumOrderAmountCentsForE2e();

    try {
      await setOfficialStoreMinimumOrderAmountCentsForE2e(MINIMUM_ORDER_CENTS);

      const category = await createE2eMenuCategory({
        name: `E2E Menu Mobile Cart Cat ${stamp}`,
      });
      await createE2eMenuProduct({
        categoryId: category.id,
        storeId: category.storeId,
        name: productName,
        priceCents: PRODUCT_PRICE_CENTS,
      });

      await page.goto("/na-brasa");
      const card = page
        .getByTestId("menu-product-card")
        .filter({ hasText: productName });
      await card.getByTestId("open-add-to-cart-button").click();
      await page.getByTestId("add-to-cart-button").click();

      const cart = page.getByTestId("cart-summary");
      await expect(cart).toBeVisible();
      await expect(page.getByTestId("cart-subtotal")).toBeVisible();
      await expect(page.getByTestId("cart-minimum-order-indicator")).toHaveText(
        expectedDeliveryMinimum,
      );

      const checkoutCta = page.getByTestId("checkout-cta");
      await expect(checkoutCta).toBeVisible();
      await expect(checkoutCta).toBeInViewport();

      await page.reload();
      await expect(page.getByTestId("cart-summary")).toBeVisible();
      await expect(page.getByTestId("cart-subtotal")).toBeVisible();
      await expect(page.getByTestId("cart-minimum-order-indicator")).toHaveText(
        expectedDeliveryMinimum,
      );

      await page.getByTestId("checkout-cta").click();
      await expect(page).toHaveURL(/\/na-brasa\/checkout/);
      await expect(page.getByLabel("Nome")).toBeVisible();
      await expect(page.getByLabel("WhatsApp para contato")).toBeVisible();
      await expect(page.getByTestId("checkout-order-summary")).toBeVisible();
      await expect(page.getByTestId("checkout-submit-button")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    } finally {
      if (originalMinimum !== null) {
        await setOfficialStoreMinimumOrderAmountCentsForE2e(originalMinimum);
      }
    }
  });

  test("unavailable product keeps badge and disabled add on mobile", async ({
    page,
  }) => {
    const stamp = Date.now();
    const productName = `E2E Menu Mobile Unavailable ${stamp}`;
    const category = await createE2eMenuCategory({
      name: `E2E Menu Mobile Unavailable Cat ${stamp}`,
    });
    await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: productName,
      available: false,
    });

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: productName });
    await expect(card).toHaveCount(1);
    await expect(card.getByTestId("menu-product-unavailable-badge")).toBeVisible();
    await expect(card.getByTestId("open-add-to-cart-button")).toBeDisabled();
    await expectNoHorizontalOverflow(page);
  });

  test("checkout keeps sticky total and single CTA accessible while scrolling", async ({
    page,
  }) => {
    const stamp = Date.now();
    const productName = `E2E Menu Mobile Sticky Checkout ${stamp}`;
    const expectedTotal = formatMoneyBr(PRODUCT_PRICE_CENTS);

    const category = await createE2eMenuCategory({
      name: `E2E Menu Mobile Sticky Cat ${stamp}`,
    });
    await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: productName,
      priceCents: PRODUCT_PRICE_CENTS,
    });

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: productName });
    await card.getByTestId("open-add-to-cart-button").click();
    await page.getByTestId("add-to-cart-button").click();
    await page.getByTestId("checkout-cta").click();
    await expect(page).toHaveURL(/\/na-brasa\/checkout/);

    const stickySummary = page.getByTestId("checkout-mobile-sticky-summary");
    const stickyTotal = page.getByTestId("checkout-sticky-total");
    const submit = page.getByTestId("checkout-submit-button");
    const submitBar = page.getByTestId("checkout-submit-bar");

    await expect(stickySummary).toBeVisible();
    await expect(stickyTotal).toHaveText(expectedTotal);
    await expect(page.getByTestId("checkout-estimated-total")).toHaveText(
      expectedTotal,
    );
    await expect(submit).toBeVisible();
    await expect(submit).toBeEnabled();
    await expect(submit).toHaveCount(1);

    const barPosition = await submitBar.evaluate(
      (el) => getComputedStyle(el).position,
    );
    expect(barPosition).toBe("fixed");

    const notes = page.getByLabel("Observações do pedido");
    await notes.focus();
    await expect(stickyTotal).toBeInViewport();
    await expect(submit).toBeInViewport();
    await expect(submit).toBeVisible();

    const notesBox = await notes.boundingBox();
    const barBox = await submitBar.boundingBox();
    expect(notesBox).not.toBeNull();
    expect(barBox).not.toBeNull();
    if (notesBox && barBox) {
      // Useful portion of the focused field must sit above the sticky bar
      // (not just a few unusable pixels). Full field above the bar is fine.
      const visibleHeightAboveBar = barBox.y - notesBox.y;
      expect(visibleHeightAboveBar).toBeGreaterThanOrEqual(
        Math.min(notesBox.height, 48),
      );
    }

    await expectNoHorizontalOverflow(page);
  });

  test("checkout sticky bar does not cover near-end validation errors on mobile", async ({
    page,
  }) => {
    const stamp = Date.now();
    const productName = `E2E Menu Mobile Checkout Errors ${stamp}`;

    const category = await createE2eMenuCategory({
      name: `E2E Menu Mobile Checkout Errors Cat ${stamp}`,
    });
    await createE2eMenuProduct({
      categoryId: category.id,
      storeId: category.storeId,
      name: productName,
      priceCents: PRODUCT_PRICE_CENTS,
    });

    await page.goto("/na-brasa");
    const card = page
      .getByTestId("menu-product-card")
      .filter({ hasText: productName });
    await card.getByTestId("open-add-to-cart-button").click();
    await page.getByTestId("add-to-cart-button").click();
    await page.getByTestId("checkout-cta").click();
    await expect(page).toHaveURL(/\/na-brasa\/checkout/);

    // Fill early required fields so the only error is near the end (troco).
    await page.getByLabel("Nome").fill("Cliente E2E Mobile");
    await page.getByLabel("WhatsApp para contato").fill(e2ePhone);
    await page.getByText("Dinheiro", { exact: true }).click();
    await page.getByLabel("Preciso de troco").check();

    await page.getByTestId("checkout-submit-button").click();

    const changeError = page.getByText("Informe o valor para troco");
    await expect(changeError).toBeVisible();
    await changeError.scrollIntoViewIfNeeded();

    const errorBox = await changeError.boundingBox();
    const barBox = await page.getByTestId("checkout-submit-bar").boundingBox();
    expect(errorBox).not.toBeNull();
    expect(barBox).not.toBeNull();
    if (errorBox && barBox) {
      expect(boxesOverlapVertically(errorBox, barBox)).toBe(false);
      expect(errorBox.y + errorBox.height).toBeLessThanOrEqual(barBox.y + 1);
    }

    await expect(page.getByTestId("checkout-sticky-total")).toBeInViewport();
    await expect(page.getByTestId("checkout-submit-button")).toBeInViewport();
  });

  test("category jump navigation scrolls horizontally and jumps without page overflow", async ({
    page,
  }) => {
    const stamp = Date.now();
    const catAName = `E2E Menu Mobile Jump Cat A ${stamp}`;
    const catBName = `E2E Menu Mobile Jump Cat B ${stamp}`;
    const longCatName = `E2E Menu Mobile Jump Cat Long Name ${stamp} Bebidas Geladas e Sobremesas Especiais`;

    const catA = await createE2eMenuCategory({
      name: catAName,
      sortOrder: 9300,
    });
    const catB = await createE2eMenuCategory({
      name: catBName,
      sortOrder: 9301,
    });
    const catLong = await createE2eMenuCategory({
      name: longCatName,
      sortOrder: 9302,
    });

    await createE2eMenuProduct({
      categoryId: catA.id,
      storeId: catA.storeId,
      name: `E2E Menu Mobile Jump Product A ${stamp}`,
      priceCents: PRODUCT_PRICE_CENTS,
    });
    await createE2eMenuProduct({
      categoryId: catB.id,
      storeId: catB.storeId,
      name: `E2E Menu Mobile Jump Product B ${stamp}`,
      priceCents: PRODUCT_PRICE_CENTS,
    });
    await createE2eMenuProduct({
      categoryId: catLong.id,
      storeId: catLong.storeId,
      name: `E2E Menu Mobile Jump Product Long ${stamp}`,
      priceCents: PRODUCT_PRICE_CENTS,
    });

    await page.goto("/na-brasa");

    const nav = page.getByRole("navigation", {
      name: "Categorias do cardápio",
    });
    await expect(nav).toBeVisible();

    const navBox = await nav.boundingBox();
    const viewport = page.viewportSize();
    expect(navBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (navBox && viewport) {
      expect(navBox.width).toBeLessThanOrEqual(viewport.width + 1);
    }

    const scrollMetrics = await nav.evaluate((element) => {
      const scroller = element.querySelector("ul");
      if (!scroller) {
        return { scrollWidth: 0, clientWidth: 0 };
      }
      return {
        scrollWidth: scroller.scrollWidth,
        clientWidth: scroller.clientWidth,
      };
    });
    expect(scrollMetrics.scrollWidth).toBeGreaterThan(scrollMetrics.clientWidth);

    await page
      .getByTestId("menu-product-card")
      .filter({ hasText: `E2E Menu Mobile Jump Product A ${stamp}` })
      .getByTestId("open-add-to-cart-button")
      .click();
    await page.getByTestId("add-to-cart-button").click();
    await expect(page.getByTestId("cart-summary")).toBeVisible();

    await nav.getByRole("link", { name: catBName }).click();
    await expect(page).toHaveURL(new RegExp(`#category-${catB.id}$`));
    await expect(
      page.getByRole("heading", { name: catBName, level: 2 }),
    ).toBeInViewport();
    await expect(page.getByTestId("cart-summary")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("closed store shows status and closed checkout CTA on mobile", async ({
    page,
  }) => {
    const stamp = Date.now();
    const productName = `E2E Menu Mobile Closed Store Product ${stamp}`;
    const originalIsOpen = await getOfficialStoreIsOpenForE2e();

    try {
      await setOfficialStoreIsOpenForE2e(true);

      const category = await createE2eMenuCategory({
        name: `E2E Menu Mobile Closed Cat ${stamp}`,
      });
      await createE2eMenuProduct({
        categoryId: category.id,
        storeId: category.storeId,
        name: productName,
        priceCents: PRODUCT_PRICE_CENTS,
      });

      await page.goto("/na-brasa");
      const card = page
        .getByTestId("menu-product-card")
        .filter({ hasText: productName });
      await card.getByTestId("open-add-to-cart-button").click();
      await page.getByTestId("add-to-cart-button").click();
      await expect(page.getByTestId("checkout-cta")).toBeVisible();

      await setOfficialStoreIsOpenForE2e(false);
      await page.reload();

      await expect(page.getByTestId("store-status-badge")).toHaveText(
        "Fechado no momento",
      );
      await expect(page.getByTestId("store-closed-notice")).toBeVisible();
      await expect(page.getByTestId("cart-summary")).toBeVisible();
      await expect(page.getByTestId("checkout-cta-closed")).toBeVisible();
      await expect(page.getByTestId("checkout-cta")).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
    } finally {
      if (originalIsOpen !== null) {
        await setOfficialStoreIsOpenForE2e(originalIsOpen);
      }
    }
  });
});
