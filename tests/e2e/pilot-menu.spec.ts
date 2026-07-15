import { expect, test } from "@playwright/test";
import {
  ensureOfficialStoreDisplayNameForE2e,
  ensurePilotMenuForE2e,
} from "./helpers/db";
import { openAddToCartForProduct } from "./helpers/menu";
import { PILOT_BURGER_PRODUCT_NAME } from "../../prisma/na-braza-pilot-menu";

test.describe("Na Braza pilot menu", () => {
  test.beforeEach(async () => {
    await ensureOfficialStoreDisplayNameForE2e();
    await ensurePilotMenuForE2e();
  });

  test("shows pilot burger, hides legacy seed burger, addons and beer +18", async ({
    page,
  }) => {
    await page.goto("/na-brasa");
    await expect(page.getByTestId("store-hero")).toBeVisible();

    await expect(
      page.getByRole("heading", { name: PILOT_BURGER_PRODUCT_NAME, level: 3 }).first(),
    ).toBeVisible();
    await expect(page.getByText("R$ 25,00").first()).toBeVisible();
    await expect(page.getByText("Burger Na Braza")).toHaveCount(0);

    await expect(
      page.getByRole("heading", { name: "Lanches artesanais", level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Espetinhos na Brasa", level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Bebidas", level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Cervejas", level: 2 }),
    ).toBeVisible();

    await openAddToCartForProduct(page, PILOT_BURGER_PRODUCT_NAME);
    await expect(page.getByText("Bacon extra")).toBeVisible();

    await expect(
      page
        .getByText("Produto permitido apenas para maiores de 18 anos.")
        .first(),
    ).toBeVisible();
  });
});
