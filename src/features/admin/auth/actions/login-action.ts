"use server";

import { redirect } from "next/navigation";
import { adminLoginSchema } from "@/features/admin/auth/admin-auth.schema";
import {
  INVALID_CREDENTIALS_MESSAGE,
  authenticateAdminUser,
} from "@/features/admin/auth/authenticate-admin-user";
import { getAdminPostLoginPath } from "@/features/admin/auth/admin-post-login";
import { createAdminSession } from "@/features/admin/auth/admin-session";
import type { AdminLoginResult } from "@/features/admin/auth/types";
import {
  ABUSE_RATE_LIMIT_MESSAGE,
  adminLoginRateLimiter,
  checkAbuseRateLimit,
} from "@/features/ops/abuse-rate-limit";
import { resolveRequestRateLimitKey } from "@/features/ops/request-rate-limit-key";

/**
 * Database-backed admin login.
 * MASTER lands on /master; Store roles land on /admin.
 */
export async function loginAdminAction(
  input: unknown,
): Promise<AdminLoginResult> {
  const rateKey = await resolveRequestRateLimitKey("admin-login");
  if (!checkAbuseRateLimit(adminLoginRateLimiter, rateKey).allowed) {
    return { ok: false, message: ABUSE_RATE_LIMIT_MESSAGE };
  }

  const parsed = adminLoginSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: INVALID_CREDENTIALS_MESSAGE };
  }

  const { email, password } = parsed.data;

  const user = await authenticateAdminUser(email, password);
  if (!user) {
    return { ok: false, message: INVALID_CREDENTIALS_MESSAGE };
  }

  try {
    await createAdminSession(user);
  } catch {
    console.error("[loginAdminAction] failed to create session");
    return {
      ok: false,
      message: "Não foi possível iniciar a sessão. Tente novamente.",
    };
  }

  redirect(getAdminPostLoginPath(user.role));
}
