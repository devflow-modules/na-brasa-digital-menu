import type { IfoodConnection, PrismaClient } from "@prisma/client";

const LOCK_TTL_MS = 90_000;

/**
 * Upsert Store ↔ merchant binding.
 * Create starts active; update never reactivates a deactivated connection.
 */
export async function ensureIfoodConnection(
  prisma: PrismaClient,
  input: { storeSlug: string; merchantId: string },
): Promise<IfoodConnection> {
  const store = await prisma.store.findUnique({
    where: { slug: input.storeSlug },
    select: { id: true },
  });
  if (!store) {
    throw new Error(`Store not found for slug=${input.storeSlug}`);
  }

  return prisma.ifoodConnection.upsert({
    where: { merchantId: input.merchantId },
    create: {
      storeId: store.id,
      merchantId: input.merchantId,
      isActive: true,
    },
    update: {
      storeId: store.id,
    },
  });
}

export async function loadIfoodConnection(
  prisma: PrismaClient,
  connectionId: string,
): Promise<IfoodConnection | null> {
  return prisma.ifoodConnection.findUnique({
    where: { id: connectionId },
  });
}

export async function acquireIfoodPollLock(
  prisma: PrismaClient,
  connectionId: string,
  lockedBy: string,
  now = new Date(),
): Promise<boolean> {
  const staleBefore = new Date(now.getTime() - LOCK_TTL_MS);
  const result = await prisma.ifoodConnection.updateMany({
    where: {
      id: connectionId,
      isActive: true,
      OR: [{ pollLockedAt: null }, { pollLockedAt: { lt: staleBefore } }],
    },
    data: {
      pollLockedAt: now,
      pollLockedBy: lockedBy,
    },
  });
  return result.count === 1;
}

export async function releaseIfoodPollLock(
  prisma: PrismaClient,
  connectionId: string,
  lockedBy: string,
  polledAt: Date,
): Promise<void> {
  await prisma.ifoodConnection.updateMany({
    where: {
      id: connectionId,
      pollLockedBy: lockedBy,
    },
    data: {
      pollLockedAt: null,
      pollLockedBy: null,
      lastPolledAt: polledAt,
    },
  });
}
