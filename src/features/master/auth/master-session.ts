import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/features/admin/auth/admin-session";
import type { AdminSessionPayload } from "@/features/admin/auth/types";

export type MasterSession = AdminSessionPayload & { role: "MASTER" };

/**
 * Returns the current session only when role is MASTER.
 * Does not redirect — useful for optional checks.
 */
export async function getMasterSession(): Promise<MasterSession | null> {
  const session = await getAdminSession();

  if (!session || session.role !== "MASTER") {
    return null;
  }

  return session as MasterSession;
}

/**
 * Guards /master routes.
 * - No session → /admin/login
 * - Non-MASTER → notFound() (no dedicated 403 page in the app)
 */
export async function requireMasterSession(): Promise<MasterSession> {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (session.role !== "MASTER") {
    notFound();
  }

  return session as MasterSession;
}
