"use server";

import { redirect } from "next/navigation";
import { clearAdminSession } from "@/features/admin/auth/admin-session";

export async function logoutAdminAction(): Promise<void> {
  await clearAdminSession();
  redirect("/admin/login");
}
