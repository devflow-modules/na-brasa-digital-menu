import { notFound, redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getAdminSession } from "@/features/admin/auth/admin-session";
import type { AdminSessionPayload } from "@/features/admin/auth/types";
import { prisma } from "@/lib/prisma";

const STORE_ROLES = new Set<UserRole>([
  "STORE_OWNER",
  "MANAGER",
  "OPERATOR",
  "KITCHEN",
]);

export type AdminStoreContext = {
  session: AdminSessionPayload;
  storeId: string;
  storeSlug: string;
  storeName: string;
  role: UserRole;
  isMaster: boolean;
};

function getDefaultStoreSlug(): string {
  return process.env.NEXT_PUBLIC_STORE_SLUG?.trim() || "na-brasa";
}

/**
 * Soft resolve for Server Actions that must not redirect (e.g. polling).
 * Returns null when session is missing, role is unsupported, or Store cannot
 * be resolved — never redirects or calls notFound().
 * Store id is never taken from querystring/body.
 */
export async function getAdminStoreContextOrNull(): Promise<AdminStoreContext | null> {
  const session = await getAdminSession();

  if (!session) {
    return null;
  }

  if (session.role === "MASTER") {
    const slug = getDefaultStoreSlug();
    const store = await prisma.store.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });

    if (!store) {
      return null;
    }

    return {
      session,
      storeId: store.id,
      storeSlug: store.slug,
      storeName: store.name,
      role: session.role,
      isMaster: true,
    };
  }

  if (STORE_ROLES.has(session.role)) {
    if (!session.storeId) {
      return null;
    }

    const store = await prisma.store.findUnique({
      where: { id: session.storeId },
      select: { id: true, slug: true, name: true },
    });

    if (!store) {
      return null;
    }

    return {
      session,
      storeId: store.id,
      storeSlug: store.slug,
      storeName: store.name,
      role: session.role,
      isMaster: false,
    };
  }

  return null;
}

/**
 * Resolves the effective Store for /admin after authentication.
 * - MASTER: transitional access to Store from NEXT_PUBLIC_STORE_SLUG
 * - Store roles: must have session.storeId
 * Store id is never taken from querystring/body.
 */
export async function requireAdminStoreContext(): Promise<AdminStoreContext> {
  const context = await getAdminStoreContextOrNull();

  if (!context) {
    const session = await getAdminSession();
    if (!session) {
      redirect("/admin/login");
    }
    notFound();
  }

  return context;
}
