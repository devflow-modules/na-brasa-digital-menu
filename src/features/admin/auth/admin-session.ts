import { cookies } from "next/headers";
import {
  isAdminSessionValidForUser,
} from "@/features/admin/auth/admin-session-verifier";
import { loadAdminSessionUser } from "@/features/admin/auth/admin-session-user";
import {
  getAdminSessionMaxAgeSeconds,
  signAdminToken,
  toAdminSessionPayload,
  verifyAdminToken,
} from "@/features/admin/auth/admin-jwt";
import type {
  AdminSessionPayload,
  AuthenticatedAdminUser,
} from "@/features/admin/auth/types";

function getSessionCookieName(): string {
  return process.env.ADMIN_SESSION_COOKIE?.trim() || "na-brasa-admin-session";
}

function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    // Shared by /admin and /master session guards
    path: "/",
    maxAge,
  };
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (!token) {
    return null;
  }

  const claims = await verifyAdminToken(token);
  if (!claims) {
    return null;
  }

  const user = await loadAdminSessionUser(claims.userId);
  if (!isAdminSessionValidForUser(claims, user)) {
    return null;
  }

  return toAdminSessionPayload(claims);
}

export async function createAdminSession(
  user: AuthenticatedAdminUser,
): Promise<void> {
  const token = await signAdminToken(user);
  const cookieStore = await cookies();

  cookieStore.set(
    getSessionCookieName(),
    token,
    getCookieOptions(getAdminSessionMaxAgeSeconds()),
  );
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), "", {
    ...getCookieOptions(0),
    maxAge: 0,
  });
}
