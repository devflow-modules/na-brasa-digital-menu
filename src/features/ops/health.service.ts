import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

export type HealthCheckOk = {
  ok: true;
  status: "ok";
  db: "ok";
  timestamp: string;
};

export type HealthCheckDegraded = {
  ok: false;
  status: "degraded";
  db: "unavailable";
  timestamp: string;
};

export type HealthCheckResult = HealthCheckOk | HealthCheckDegraded;

export type HealthCheckDeps = {
  prisma: Pick<PrismaClient, "$queryRaw">;
  now?: () => Date;
};

export async function checkHealth(
  deps: HealthCheckDeps = { prisma: defaultPrisma },
): Promise<HealthCheckResult> {
  const timestamp = (deps.now ?? (() => new Date()))().toISOString();
  try {
    await deps.prisma.$queryRaw`SELECT 1`;
    return { ok: true, status: "ok", db: "ok", timestamp };
  } catch {
    return {
      ok: false,
      status: "degraded",
      db: "unavailable",
      timestamp,
    };
  }
}
