import { cache } from "react";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const adminSessionUserSelect = {
  id: true,
  isActive: true,
  sessionVersion: true,
  role: true,
  storeId: true,
} as const;

export type AdminSessionUserRow = {
  id: string;
  isActive: boolean;
  sessionVersion: number;
  role: UserRole;
  storeId: string | null;
};

/**
 * Loads persisted session fields once per request (deduped via React cache).
 */
export const loadAdminSessionUser = cache(
  async (userId: string): Promise<AdminSessionUserRow | null> => {
    return prisma.user.findUnique({
      where: { id: userId },
      select: adminSessionUserSelect,
    });
  },
);
