import { PrismaClient } from "@prisma/client";
import {
  FUNNEL_EVENT_RETENTION_DAYS,
} from "../src/features/analytics/funnel-event-names";
import { buildFunnelEventPurgePlan } from "../src/features/analytics/funnel-event-retention";

const CONFIRM_ENV = "CONFIRM_FUNNEL_EVENT_PURGE";

function isApplyMode(): boolean {
  return process.env[CONFIRM_ENV] === "true";
}

function parseRetentionDays(): number {
  const raw = process.env.FUNNEL_EVENT_RETENTION_DAYS;
  if (!raw) return FUNNEL_EVENT_RETENTION_DAYS;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("FUNNEL_EVENT_RETENTION_DAYS must be a positive integer");
  }
  return parsed;
}

function parseStoreId(): string | null {
  const raw = process.env.FUNNEL_EVENT_PURGE_STORE_ID?.trim();
  return raw ? raw : null;
}

async function main(): Promise<void> {
  const apply = isApplyMode();
  const retentionDays = parseRetentionDays();
  const storeId = parseStoreId();
  const plan = buildFunnelEventPurgePlan({ retentionDays, storeId });
  const prisma = new PrismaClient();

  try {
    const count = await prisma.funnelEvent.count({ where: plan.where });

    console.log("Funnel event retention purge");
    console.log(`mode: ${apply ? "APPLY" : "DRY-RUN"}`);
    console.log(`retentionDays: ${plan.retentionDays}`);
    console.log(`cutoff (occurredAt <): ${plan.cutoff.toISOString()}`);
    console.log(`storeId filter: ${plan.storeId ?? "(all stores)"}`);
    console.log(`matching rows: ${count}`);

    if (!apply) {
      console.log(
        `Dry-run only. Set ${CONFIRM_ENV}=true to delete matching rows.`,
      );
      return;
    }

    if (count === 0) {
      console.log("Nothing to delete.");
      return;
    }

    const result = await prisma.funnelEvent.deleteMany({ where: plan.where });
    console.log(`deleted: ${result.count}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
