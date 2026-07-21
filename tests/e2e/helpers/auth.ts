import type { Page } from "@playwright/test";
import { jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";
import {
  ensureE2eAdminUser,
  getE2eAdminCredentials,
} from "./e2e-admin-user";
import { getSessionCookieName } from "./test-data";

export type DecodedAdminSession = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  storeId: string | null;
};

/**
 * Logs in as the E2E MASTER user. Lands on /master (no implicit Store context).
 */
export async function loginAdmin(page: Page): Promise<void> {
  await ensureE2eAdminUser();
  const { email, password } = getE2eAdminCredentials();

  await page.goto("/admin/login");
  await page.getByTestId("admin-login-email").fill(email);
  await page.getByTestId("admin-login-password").fill(password);
  await page.getByTestId("admin-login-submit").click();
  await page.waitForURL(/\/master\/?$/);
}

/**
 * Logs in as a Store-scoped user. Lands on /admin.
 */
export async function loginAsUser(
  page: Page,
  credentials: { email: string; password: string },
): Promise<void> {
  await page.goto("/admin/login");
  await page.getByTestId("admin-login-email").fill(credentials.email);
  await page.getByTestId("admin-login-password").fill(credentials.password);
  await page.getByTestId("admin-login-submit").click();
  await page.waitForURL(/\/admin\/?$/);
}

export async function logoutAdmin(page: Page): Promise<void> {
  const userMenuTrigger = page.getByTestId("admin-user-menu-trigger");
  if ((await userMenuTrigger.count()) > 0) {
    if ((await userMenuTrigger.getAttribute("aria-expanded")) !== "true") {
      await userMenuTrigger.click();
    }
    await page.getByTestId("admin-user-menu-panel").waitFor({ state: "visible" });
  }
  await page.getByTestId("admin-logout-button").click();
  await page.waitForURL(/\/admin\/login/);
}

export async function readAdminSessionFromBrowser(
  page: Page,
): Promise<DecodedAdminSession> {
  const cookieName = getSessionCookieName();
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((cookie) => cookie.name === cookieName);

  if (!sessionCookie?.value) {
    throw new Error(`Session cookie "${cookieName}" not found`);
  }

  const secret = process.env.ADMIN_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET is required to decode E2E session");
  }

  const { payload } = await jwtVerify(
    sessionCookie.value,
    new TextEncoder().encode(secret),
    { algorithms: ["HS256"] },
  );

  if (
    typeof payload.userId !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.role !== "string"
  ) {
    throw new Error("Admin session payload is missing expected claims");
  }

  const storeId =
    payload.storeId === undefined || payload.storeId === null
      ? null
      : typeof payload.storeId === "string"
        ? payload.storeId
        : null;

  if (payload.storeId !== undefined && payload.storeId !== null && storeId === null) {
    throw new Error("Admin session storeId claim is invalid");
  }

  return {
    userId: payload.userId,
    name: payload.name,
    email: payload.email,
    role: payload.role as UserRole,
    storeId,
  };
}
