"use server";

import { redirect } from "next/navigation";
import { adminLoginSchema } from "@/features/admin/auth/admin-auth.schema";
import { createAdminSession } from "@/features/admin/auth/admin-session";
import type { AdminLoginResult } from "@/features/admin/auth/types";
import { verifyAdminCredentials } from "@/features/admin/auth/verify-admin-credentials";

export async function loginAdminAction(
  input: unknown,
): Promise<AdminLoginResult> {
  const parsed = adminLoginSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Credenciais inválidas." };
  }

  const { email, password } = parsed.data;

  if (!verifyAdminCredentials(email, password)) {
    return { ok: false, message: "Credenciais inválidas." };
  }

  try {
    await createAdminSession(email.trim().toLowerCase());
  } catch {
    console.error("[loginAdminAction] failed to create session");
    return {
      ok: false,
      message: "Não foi possível iniciar a sessão. Tente novamente.",
    };
  }

  redirect("/admin");
}
