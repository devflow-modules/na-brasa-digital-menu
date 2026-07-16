import { expect, test } from "@playwright/test";
import { loginAsUser, logoutAdmin } from "./helpers/auth";
import {
  bannerForCustomer,
  cleanupTrackedNotifyFixtures,
  createNotifyFixture,
  enableNotificationSound,
  expectNoNotificationChrome,
  formatOrderMoney,
  NOTIFICATION_POLL_TIMEOUT_MS,
  readPendingBadgeCount,
  readSoundPlayCount,
  trackNotifyStoreId,
  waitForNotificationChrome,
} from "./helpers/admin-new-order-notifications";
import { seedCounterOrderE2eCatalog } from "./helpers/counter-order-catalog";
import {
  createE2ePickupOrder,
  disconnectE2ePrisma,
  ensureE2eStore,
  findLatestOrderByCustomerName,
  getOrderStatus,
} from "./helpers/db";
import { uniqueCustomerName } from "./helpers/test-data";

test.use({
  launchOptions: {
    args: ["--autoplay-policy=no-user-gesture-required"],
  },
});

test.describe("admin new-order notifications E2E", () => {
  test.beforeAll(() => {
    process.env.E2E_ALLOW_DB_CLEANUP = "true";
  });

  test.afterEach(async () => {
    await cleanupTrackedNotifyFixtures();
  });

  test.afterAll(async () => {
    await cleanupTrackedNotifyFixtures();
    await disconnectE2ePrisma();
  });

  test("login lifecycle starts provider only after authenticated navigation", async ({
    page,
  }) => {
    const fixture = await createNotifyFixture("login");

    await page.goto("/admin/login");
    await expect(page.getByTestId("admin-login-submit")).toBeVisible();
    await expectNoNotificationChrome(page);

    await page.getByTestId("admin-login-email").fill(fixture.operator.email);
    await page
      .getByTestId("admin-login-password")
      .fill(fixture.operator.password);
    await page.getByTestId("admin-login-submit").click();
    await page.waitForURL(/\/admin\/?$/);

    await waitForNotificationChrome(page);
    await expect(page.getByTestId("admin-new-order-banner")).toHaveCount(0);
    await expect(page.getByTestId("admin-new-order-sound-play-count")).toHaveAttribute(
      "data-sound-play-count",
      "0",
    );

    await logoutAdmin(page);
    await expect(page).toHaveURL(/\/admin\/login/);
    await expectNoNotificationChrome(page);
  });

  test("bootstrap skips historical DIRECT; new DIRECT alerts once", async ({
    page,
  }) => {
    const fixture = await createNotifyFixture("bootstrap");
    const oldCustomer = uniqueCustomerName("Notify Old");
    const oldOrder = await createE2ePickupOrder({
      customerName: oldCustomer,
      storeSlug: fixture.store.slug,
      status: "PENDING",
    });
    expect(oldOrder.source).toBe("DIRECT");

    await loginAsUser(page, fixture.operator);
    await waitForNotificationChrome(page);
    await expect(page.getByTestId("admin-new-order-banner")).toHaveCount(0);
    await expect(
      page.getByTestId("admin-new-order-banner").filter({ hasText: oldCustomer }),
    ).toHaveCount(0);
    expect(await readSoundPlayCount(page)).toBe(0);

    const pendingBaseline = await readPendingBadgeCount(page);
    expect(pendingBaseline).toBeGreaterThanOrEqual(1);

    await enableNotificationSound(page);
    const soundAfterToggle = await readSoundPlayCount(page);

    const newCustomer = uniqueCustomerName("Notify New");
    const newOrder = await createE2ePickupOrder({
      customerName: newCustomer,
      storeSlug: fixture.store.slug,
      status: "PENDING",
    });
    expect(newOrder.source).toBe("DIRECT");
    expect(newOrder.status).toBe("PENDING");
    expect(newOrder.storeId).toBe(fixture.store.id);

    const banner = bannerForCustomer(page, newCustomer);
    await expect(banner).toBeVisible({ timeout: NOTIFICATION_POLL_TIMEOUT_MS });
    await expect(banner).toContainText(newOrder.code);
    await expect(banner).toContainText(formatOrderMoney(newOrder.totalCents));

    await expect
      .poll(async () => readPendingBadgeCount(page), {
        timeout: NOTIFICATION_POLL_TIMEOUT_MS,
      })
      .toBe(pendingBaseline + 1);

    await expect
      .poll(async () => readSoundPlayCount(page), {
        timeout: NOTIFICATION_POLL_TIMEOUT_MS,
      })
      .toBe(soundAfterToggle + 1);

    await banner.getByRole("link", { name: "Abrir pedido" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/pedidos/${newOrder.id}`));
    await expect(page.getByTestId("admin-order-detail")).toBeVisible();
    await expect(
      page
        .getByTestId("admin-order-detail")
        .getByText(newCustomer, { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("admin-order-detail")
        .getByRole("heading", { name: `#${newOrder.code}` }),
    ).toBeVisible();
  });

  test("sound stays off until toggle; dismiss prevents replay", async ({
    page,
  }) => {
    const fixture = await createNotifyFixture("sound-dismiss");
    await loginAsUser(page, fixture.operator);
    await waitForNotificationChrome(page);

    const checkbox = page
      .getByTestId("admin-new-order-sound-toggle")
      .locator('input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked();
    expect(await readSoundPlayCount(page)).toBe(0);

    const quietCustomer = uniqueCustomerName("Notify Quiet");
    await createE2ePickupOrder({
      customerName: quietCustomer,
      storeSlug: fixture.store.slug,
    });
    const quietBanner = bannerForCustomer(page, quietCustomer);
    await expect(quietBanner).toBeVisible({
      timeout: NOTIFICATION_POLL_TIMEOUT_MS,
    });
    expect(await readSoundPlayCount(page)).toBe(0);

    await quietBanner.getByRole("button", { name: "Dispensar" }).click();
    await expect(quietBanner).toHaveCount(0);

    const soundAfterToggle = await enableNotificationSound(page);
    const loudCustomer = uniqueCustomerName("Notify Loud");
    await createE2ePickupOrder({
      customerName: loudCustomer,
      storeSlug: fixture.store.slug,
    });
    const loudBanner = bannerForCustomer(page, loudCustomer);
    await expect(loudBanner).toBeVisible({
      timeout: NOTIFICATION_POLL_TIMEOUT_MS,
    });
    await expect
      .poll(async () => readSoundPlayCount(page), {
        timeout: NOTIFICATION_POLL_TIMEOUT_MS,
      })
      .toBe(soundAfterToggle + 1);

    const soundAfterAlert = await readSoundPlayCount(page);
    await loudBanner.getByRole("button", { name: "Dispensar" }).click();
    await expect(loudBanner).toHaveCount(0);

    await expect
      .poll(
        async () => {
          const gone =
            (await bannerForCustomer(page, loudCustomer).count()) === 0;
          const soundStable =
            (await readSoundPlayCount(page)) === soundAfterAlert;
          return gone && soundStable;
        },
        { timeout: NOTIFICATION_POLL_TIMEOUT_MS },
      )
      .toBe(true);
  });

  test("COUNTER via balcão stays silent while PENDING badge can rise", async ({
    page,
  }) => {
    const fixture = await createNotifyFixture("counter");
    const catalog = await seedCounterOrderE2eCatalog({
      storeSlug: fixture.store.slug,
      suffix: fixture.suffix,
    });

    await loginAsUser(page, fixture.operator);
    await waitForNotificationChrome(page);
    const pendingBaseline = await readPendingBadgeCount(page);
    const soundBaseline = await readSoundPlayCount(page);
    const bannerBaseline = await page.getByTestId("admin-new-order-banner").count();

    await page.getByTestId("admin-counter-nav-link").click();
    await expect(page.getByTestId("admin-counter-order-page")).toBeVisible();
    await page
      .getByTestId(`counter-order-product-${catalog.plainProduct.id}`)
      .click();
    await page.getByTestId("counter-order-open-review").click();
    await expect(page.getByTestId("counter-order-review")).toBeVisible();

    const counterCustomer = uniqueCustomerName("Notify Counter");
    await page.getByTestId("counter-order-customer-label").fill(counterCustomer);
    await page.getByTestId("counter-order-submit").click();
    await expect(page.getByTestId("counter-order-success")).toBeVisible({
      timeout: 15_000,
    });

    const created = await findLatestOrderByCustomerName(counterCustomer);
    expect(created).not.toBeNull();
    expect(created?.source).toBe("COUNTER");
    expect(created?.status).toBe("PENDING");
    expect(created?.storeId).toBe(fixture.store.id);

    await page.goto("/admin");
    await waitForNotificationChrome(page);

    await expect
      .poll(
        async () => {
          const counterBanner = await bannerForCustomer(
            page,
            counterCustomer,
          ).count();
          const onlineCopy = await page
            .getByText("Novo pedido online")
            .count();
          const banners = await page.getByTestId("admin-new-order-banner").count();
          const sound = await readSoundPlayCount(page);
          return (
            counterBanner === 0 &&
            onlineCopy === 0 &&
            banners === bannerBaseline &&
            sound === soundBaseline
          );
        },
        { timeout: NOTIFICATION_POLL_TIMEOUT_MS },
      )
      .toBe(true);

    await expect
      .poll(async () => readPendingBadgeCount(page), {
        timeout: NOTIFICATION_POLL_TIMEOUT_MS,
      })
      .toBeGreaterThan(pendingBaseline);
  });

  test("Store B DIRECT does not alert Store A", async ({ page }) => {
    const storeA = await createNotifyFixture("tenant-a");
    const storeB = await ensureE2eStore({
      slug: `e2e-notify-b-${storeA.suffix}`.slice(0, 48),
      name: `E2E Notify B ${storeA.suffix}`,
    });
    trackNotifyStoreId(storeB.id);
    await createE2ePickupOrder({
      customerName: uniqueCustomerName("Notify Seed B"),
      storeSlug: storeB.slug,
    });

    await loginAsUser(page, storeA.operator);
    await waitForNotificationChrome(page);
    const pendingBaseline = await readPendingBadgeCount(page);
    const soundBaseline = await readSoundPlayCount(page);

    const foreignCustomer = uniqueCustomerName("Notify Foreign");
    const foreignOrder = await createE2ePickupOrder({
      customerName: foreignCustomer,
      storeSlug: storeB.slug,
    });
    expect(foreignOrder.storeId).toBe(storeB.id);
    expect(foreignOrder.storeId).not.toBe(storeA.store.id);

    await expect
      .poll(
        async () => {
          const bannerCount = await bannerForCustomer(
            page,
            foreignCustomer,
          ).count();
          const pending = await readPendingBadgeCount(page);
          const sound = await readSoundPlayCount(page);
          const foreignText = await page.getByText(foreignCustomer).count();
          return (
            bannerCount === 0 &&
            pending === pendingBaseline &&
            sound === soundBaseline &&
            foreignText === 0
          );
        },
        { timeout: NOTIFICATION_POLL_TIMEOUT_MS },
      )
      .toBe(true);
  });

  test("PENDING badge tracks status changes and ignore dismiss", async ({
    page,
  }) => {
    const fixture = await createNotifyFixture("badge");
    await loginAsUser(page, fixture.operator);
    await waitForNotificationChrome(page);

    const customer = uniqueCustomerName("Notify Badge");
    const order = await createE2ePickupOrder({
      customerName: customer,
      storeSlug: fixture.store.slug,
    });
    const banner = bannerForCustomer(page, customer);
    await expect(banner).toBeVisible({ timeout: NOTIFICATION_POLL_TIMEOUT_MS });

    const pendingWithOrder = await readPendingBadgeCount(page);
    expect(pendingWithOrder).toBeGreaterThanOrEqual(1);

    await banner.getByRole("button", { name: "Dispensar" }).click();
    await expect(banner).toHaveCount(0);
    await expect
      .poll(async () => readPendingBadgeCount(page), {
        timeout: NOTIFICATION_POLL_TIMEOUT_MS,
      })
      .toBe(pendingWithOrder);

    await page.goto(`/admin/pedidos/${order.id}`);
    await page.getByTestId("order-status-action-CONFIRMED").click();
    await expect
      .poll(async () => getOrderStatus(order.id), { timeout: 15_000 })
      .toBe("CONFIRMED");

    await page.goto("/admin");
    await waitForNotificationChrome(page);
    await expect
      .poll(async () => readPendingBadgeCount(page), {
        timeout: NOTIFICATION_POLL_TIMEOUT_MS,
      })
      .toBeLessThan(pendingWithOrder);
  });
});
