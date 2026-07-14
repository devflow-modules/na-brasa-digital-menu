import { cookies } from "next/headers";
import {
  getAdminSessionMaxAgeSeconds,
  signAdminToken,
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
    path: "/admin",
    maxAge,
  };
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (!token) {
    return null;
  }

  return verifyAdminToken(token);
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
