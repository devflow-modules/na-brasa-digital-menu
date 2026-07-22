import { expect, test } from "@playwright/test";
import {
  clearOfficialStoreFunnelEventsForE2e,
  countOfficialStoreFunnelEventsForE2e,
  ensurePilotMenuForE2e,
  findLatestOrderByCustomerName,
  waitForOfficialStoreFunnelEventForE2e,
} from "./helpers/db";
import { addProductToCartByName, clearCartStorage } from "./helpers/menu";
import {
  CART_STORAGE_KEY,
  e2ePhone,
  uniqueCustomerName,
} from "./helpers/test-data";
import { PILOT_BURGER_PRODUCT_NAME } from "../../prisma/na-braza-pilot-menu";

const FUNNEL_SESSION_STORAGE_KEY = "na-brasa:funnel-session";

async function readFunnelSessionId(
  page: import("@playwright/test").Page,
): Promise<string> {
  const sessionId = await page.evaluate((key) => {
    return window.localStorage.getItem(key);
  }, FUNNEL_SESSION_STORAGE_KEY);
  expect(sessionId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  return sessionId!;
}

test.describe("client funnel events", () => {
  test.beforeEach(async ({ page }) => {
    await ensurePilotMenuForE2e();
    await clearCartStorage(page);
    await page.evaluate((keys) => {
      for (const key of keys) {
        window.localStorage.removeItem(key);
      }
    }, [CART_STORAGE_KEY, FUNNEL_SESSION_STORAGE_KEY]);
    await clearOfficialStoreFunnelEventsForE2e();
  });

  test("records menu_viewed, product_added, checkout_started, and whatsapp_handoff_started", async ({
    page,
  }) => {
    await page.goto("/na-brasa");
    await page.getByTestId("store-hero").waitFor();
    const sessionId = await readFunnelSessionId(page);

    await waitForOfficialStoreFunnelEventForE2e({
      name: "menu_viewed",
      sessionId,
    });

    await addProductToCartByName(page, PILOT_BURGER_PRODUCT_NAME, {
      quantity: 1,
    });
    await waitForOfficialStoreFunnelEventForE2e({
      name: "product_added",
      sessionId,
    });

    // Reload menu posts again, but server dedupe keeps a single row per session/day.
    const [reloadIngest] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/funnel-events") &&
          response.request().method() === "POST",
      ),
      page.goto("/na-brasa"),
    ]);
    expect(reloadIngest.status()).toBe(204);
    await page.getByTestId("store-hero").waitFor();
    expect(
      await countOfficialStoreFunnelEventsForE2e({
        name: "menu_viewed",
        sessionId,
      }),
    ).toBe(1);

    await page.getByTestId("checkout-cta").click();
    await expect(page).toHaveURL(/\/na-brasa\/checkout/);
    await waitForOfficialStoreFunnelEventForE2e({
      name: "checkout_started",
      sessionId,
    });

    const customerName = uniqueCustomerName("Funnel Customer");
    await page.getByLabel("Nome").fill(customerName);
    await page.getByLabel("WhatsApp para contato").fill(e2ePhone);
    await page.getByText("Retirada", { exact: true }).click();
    await page.getByText("Pix", { exact: true }).click();

    await page.route(/wa\.me|api\.whatsapp\.com/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>whatsapp-stub</title><body>ok</body>",
      });
    });

    await Promise.all([
      page.waitForURL(/wa\.me|api\.whatsapp\.com/, {
        timeout: 45_000,
        waitUntil: "commit",
      }),
      page.getByTestId("checkout-submit-button").click(),
    ]);

    const order = await findLatestOrderByCustomerName(customerName);
    expect(order).not.toBeNull();

    await waitForOfficialStoreFunnelEventForE2e({
      name: "whatsapp_handoff_started",
      orderId: order!.id,
    });
    await waitForOfficialStoreFunnelEventForE2e({
      name: "order_created",
      orderId: order!.id,
    });
  });

  test("rejects client storeId/dedupeKey and still keeps storefront usable", async ({
    page,
  }) => {
    const response = await page.request.post("/api/funnel-events", {
      data: {
        storeSlug: "na-brasa",
        storeId: "should-be-rejected",
        name: "menu_viewed",
        sessionId: "11111111-1111-4111-8111-111111111111",
      },
    });
    expect(response.status()).toBe(400);

    await page.goto("/na-brasa");
    await expect(page.getByTestId("store-hero")).toBeVisible();
  });
});
