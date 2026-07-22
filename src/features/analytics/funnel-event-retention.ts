import type { Prisma } from "@prisma/client";
import { FUNNEL_EVENT_RETENTION_DAYS } from "@/features/analytics/funnel-event-names";

export type FunnelEventPurgePlan = {
  retentionDays: number;
  cutoff: Date;
  storeId: string | null;
  where: Prisma.FunnelEventWhereInput;
};

export function buildFunnelEventPurgePlan(options: {
  now?: Date;
  retentionDays?: number;
  storeId?: string | null;
}): FunnelEventPurgePlan {
  const retentionDays = options.retentionDays ?? FUNNEL_EVENT_RETENTION_DAYS;
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error("retentionDays must be a positive integer");
  }

  const now = options.now ?? new Date();
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const storeId = options.storeId?.trim() ? options.storeId.trim() : null;

  const where: Prisma.FunnelEventWhereInput = {
    occurredAt: { lt: cutoff },
    ...(storeId ? { storeId } : {}),
  };

  return { retentionDays, cutoff, storeId, where };
}
