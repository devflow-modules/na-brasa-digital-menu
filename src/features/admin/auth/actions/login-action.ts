"use server";

import { redirect } from "next/navigation";
import { adminLoginSchema } from "@/features/admin/auth/admin-auth.schema";
import {
  INVALID_CREDENTIALS_MESSAGE,
  authenticateAdminUser,
} from "@/features/admin/auth/authenticate-admin-user";
import { createAdminSession } from "@/features/admin/auth/admin-session";
import type { AdminLoginResult } from "@/features/admin/auth/types";

/**
 * Database-backed admin login.
 * MASTER may use /admin temporarily until /master exists (ADR 0002).
 */
export async function loginAdminAction(
  input: unknown,
): Promise<AdminLoginResult> {
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

  redirect("/admin");
}
