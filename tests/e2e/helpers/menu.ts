import type { Page } from "@playwright/test";
import { CART_STORAGE_KEY } from "./test-data";

/** Preferred labels when filling required addon groups (first match wins). */
const DEFAULT_PREFERRED_REQUIRED_OPTION_LABELS = ["Queijo cheddar"] as const;

function parseRequiredSelectionCount(hint: string): number | null {
  const trimmed = hint.trim();
  if (/^Opcional\b/i.test(trimmed)) {
    return null;
  }

  const exactly = trimmed.match(/Escolha exatamente\s+(\d+)/i);
  if (exactly?.[1]) {
    return Number(exactly[1]);
  }

  const obrigatorio = trimmed.match(/Obrigatório\s*·\s*escolha\s+(\d+)/i);
  if (obrigatorio?.[1]) {
    return Number(obrigatorio[1]);
  }

  const range = trimmed.match(/Escolha de\s+(\d+)\s+a\s+(\d+)/i);
  if (range?.[1]) {
    return Number(range[1]);
  }

  // Non-optional hint without a parseable count: require at least one.
  return 1;
}

/**
 * Selects options in required addon groups opened in the add-to-cart dialog.
 * Generic: driven by UI hints (not cheese-specific), with optional preferred labels.
 */
export async function selectRequiredAddonGroupOptions(
  page: Page,
  options?: { preferredOptionLabels?: string[] },
): Promise<void> {
  const preferredLabels = (
    options?.preferredOptionLabels ?? DEFAULT_PREFERRED_REQUIRED_OPTION_LABELS
  ).map((label) => label.toLocaleLowerCase("pt-BR"));

  const dialog = page.getByTestId("add-to-cart-dialog");
  await dialog.waitFor();

  const groups = dialog.locator('fieldset[data-testid^="menu-addon-group-"]');
  const groupCount = await groups.count();

  for (let index = 0; index < groupCount; index++) {
    const group = groups.nth(index);
    const hint = ((await group.locator("p").first().textContent()) ?? "").trim();
    const requiredCount = parseRequiredSelectionCount(hint);
    if (requiredCount === null || requiredCount <= 0) {
      continue;
    }

    const optionInputs = group.locator('input[data-testid^="menu-addon-option-"]');
    const optionCount = await optionInputs.count();
    if (optionCount === 0) {
      continue;
    }

    let selectedCount = await group.locator('input[data-testid^="menu-addon-option-"]:checked').count();
    if (selectedCount >= requiredCount) {
      continue;
    }

    // Prefer named options first (e.g. Queijo cheddar on the pilot burger).
    for (const preferred of preferredLabels) {
      if (selectedCount >= requiredCount) {
        break;
      }
      const preferredInput = group
        .locator("label")
        .filter({ hasText: new RegExp(preferred.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })
        .locator('input[data-testid^="menu-addon-option-"]')
        .first();
      if ((await preferredInput.count()) === 0) {
        continue;
      }
      if (await preferredInput.isChecked()) {
        continue;
      }
      await preferredInput.check();
      selectedCount += 1;
    }

    for (let optionIndex = 0; optionIndex < optionCount; optionIndex++) {
      if (selectedCount >= requiredCount) {
        break;
      }
      const input = optionInputs.nth(optionIndex);
      if (await input.isChecked()) {
        continue;
      }
      await input.check();
      selectedCount += 1;
    }
  }
}

export async function openStoreOperationalDetails(page: Page): Promise<void> {
  const toggle = page.getByTestId("store-details-toggle");
  if ((await toggle.count()) === 0) {
    return;
  }
  if ((await toggle.getAttribute("aria-expanded")) === "true") {
    return;
  }
  await toggle.click();
  await page.getByTestId("store-operational-details").waitFor();
}

export async function expandCartSummary(page: Page): Promise<void> {
  const toggle = page.getByTestId("cart-summary-toggle");
  await toggle.waitFor();
  if ((await toggle.getAttribute("aria-expanded")) === "true") {
    return;
  }
  await toggle.click();
}

export async function openAddToCartForProduct(
  page: Page,
  productName: string,
): Promise<void> {
  await page.goto("/na-brasa");
  await page.getByTestId("store-hero").waitFor();
  const card = page
    .getByTestId("menu-product-card")
    .filter({ hasText: productName });
  await card.first().waitFor();
  await card.first().getByTestId("open-add-to-cart-button").click();
}

export async function addProductToCartByName(
  page: Page,
  productName: string,
  options?: { quantity?: number },
): Promise<void> {
  const quantity = Math.max(1, options?.quantity ?? 1);
  await openAddToCartForProduct(page, productName);
  await selectRequiredAddonGroupOptions(page);
  await page.getByTestId("add-to-cart-button").click();
  await page.getByTestId("cart-summary").waitFor();

  if (quantity > 1) {
    await expandCartSummary(page);
    const increaseButton = page
      .getByRole("button", { name: new RegExp(`^Aumentar ${productName}`) })
      .first();
    for (let i = 1; i < quantity; i++) {
      await increaseButton.click();
    }
  }
}

export async function addFirstProductToCart(
  page: Page,
  options?: { quantity?: number },
): Promise<void> {
  const quantity = Math.max(1, options?.quantity ?? 1);

  await page.goto("/na-brasa");
  await page.getByTestId("store-hero").waitFor();
  await page.getByTestId("menu-product-card").first().waitFor();
  await page.getByTestId("open-add-to-cart-button").first().click();
  await selectRequiredAddonGroupOptions(page);
  await page.getByTestId("add-to-cart-button").click();
  await page.getByTestId("cart-summary").waitFor();

  if (quantity > 1) {
    await expandCartSummary(page);
    const increaseButton = page
      .getByRole("button", { name: /^Aumentar / })
      .first();
    for (let i = 1; i < quantity; i++) {
      await increaseButton.click();
    }
  }
}

export async function clearCartStorage(page: Page): Promise<void> {
  await page.goto("/na-brasa");
  await page.evaluate((key) => window.localStorage.removeItem(key), CART_STORAGE_KEY);
}
