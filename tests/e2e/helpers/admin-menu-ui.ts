import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Isolate one category in the workspace (opens it and hides the rest). */
export async function focusAdminMenuCategory(
  page: Page,
  categoryId: string,
): Promise<void> {
  await page.getByTestId("admin-menu-filter-category").selectOption(categoryId);
  await expect(
    page.getByTestId(`admin-menu-category-${categoryId}`),
  ).toHaveAttribute("data-open", "true");
}
