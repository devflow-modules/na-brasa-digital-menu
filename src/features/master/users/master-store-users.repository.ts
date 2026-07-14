import { Prisma, type UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  isStoreUserRole,
  type MasterStoreUserListItem,
  type MasterStoreUsersPageData,
  type StoreUserRole,
} from "@/features/master/users/master-store-users.types";

const BCRYPT_ROUNDS = 10;

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  storeId: true,
  createdAt: true,
  store: { select: { name: true } },
} as const;

function toListItem(
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    storeId: string | null;
    createdAt: Date;
    store: { name: string } | null;
  },
  fallbackStoreName: string,
): MasterStoreUserListItem | null {
  if (!user.storeId || !isStoreUserRole(user.role)) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    storeId: user.storeId,
    storeName: user.store?.name ?? fallbackStoreName,
    createdAt: user.createdAt,
  };
}

export async function getMasterStoreForUsers(
  storeId: string,
): Promise<{ id: string; name: string; slug: string } | null> {
  return prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true, slug: true },
  });
}

export async function getMasterStoreUsersPageData(
  storeId: string,
): Promise<MasterStoreUsersPageData | null> {
  const store = await getMasterStoreForUsers(storeId);
  if (!store) {
    return null;
  }

  const rows = await prisma.user.findMany({
    where: {
      storeId: store.id,
      role: { in: ["STORE_OWNER", "MANAGER", "OPERATOR", "KITCHEN"] },
    },
    orderBy: [{ createdAt: "desc" }],
    select: userListSelect,
  });

  const users = rows
    .map((row) => toListItem(row, store.name))
    .filter((row): row is MasterStoreUserListItem => row !== null);

  return { store, users };
}

export async function createMasterStoreUser(input: {
  storeId: string;
  name: string;
  email: string;
  role: StoreUserRole;
  password: string;
}): Promise<
  | { ok: true; userId: string }
  | { ok: false; code: "STORE_NOT_FOUND" | "EMAIL_TAKEN" | "UNKNOWN" }
> {
  const store = await getMasterStoreForUsers(input.storeId);
  if (!store) {
    return { ok: false, code: "STORE_NOT_FOUND" };
  }

  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        role: input.role,
        storeId: store.id,
        isActive: true,
      },
      select: { id: true },
    });

    return { ok: true, userId: user.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, code: "EMAIL_TAKEN" };
    }

    console.error("[createMasterStoreUser] failed");
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function setMasterStoreUserActive(input: {
  storeId: string;
  userId: string;
  isActive: boolean;
}): Promise<
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" | "UNKNOWN" }
> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, storeId: true, role: true },
  });

  if (!user || user.storeId !== input.storeId || !isStoreUserRole(user.role)) {
    return { ok: false, code: "NOT_FOUND" };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: input.isActive },
    });
    return { ok: true };
  } catch {
    console.error("[setMasterStoreUserActive] failed");
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function updateMasterStoreUserRole(input: {
  storeId: string;
  userId: string;
  role: StoreUserRole;
}): Promise<
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" | "UNKNOWN" }
> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, storeId: true, role: true },
  });

  if (!user || user.storeId !== input.storeId || !isStoreUserRole(user.role)) {
    return { ok: false, code: "NOT_FOUND" };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: input.role,
        // Keep storeId stable — never clear for store users.
        storeId: input.storeId,
      },
    });
    return { ok: true };
  } catch {
    console.error("[updateMasterStoreUserRole] failed");
    return { ok: false, code: "UNKNOWN" };
  }
}
