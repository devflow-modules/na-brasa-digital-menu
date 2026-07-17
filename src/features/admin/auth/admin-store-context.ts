import { notFound, redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { cache } from "react";
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
};

/**
 * Soft resolve for Server Actions that must not redirect (e.g. polling).
 * Returns null when session is missing, role is unsupported, or Store cannot
 * be resolved — never redirects or calls notFound().
 *
 * MASTER never receives an implicit pilot Store. Store id is never taken from
 * querystring/body. Cached per request so authenticated layout + page share
 * one resolve.
 */
export const getAdminStoreContextOrNull = cache(
  async (): Promise<AdminStoreContext | null> => {
    const session = await getAdminSession();

    if (!session) {
      return null;
    }

    // MASTER has no implicit tenant context until an explicit Store selection
    // flow exists. Soft callers (polling) treat this as unauthorized context.
    if (session.role === "MASTER") {
      return null;
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
      };
    }

    return null;
  },
);

/**
 * Resolves the effective Store for /admin after authentication.
 * - Store roles: must have a valid session.storeId
 * - MASTER without explicit Store selection: redirect to /master
 * Store id is never taken from querystring/body.
 */
export async function requireAdminStoreContext(): Promise<AdminStoreContext> {
  const context = await getAdminStoreContextOrNull();

  if (context) {
    return context;
  }

  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  if (session.role === "MASTER") {
    redirect("/master");
  }

  notFound();
}
