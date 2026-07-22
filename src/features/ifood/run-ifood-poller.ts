import { randomUUID } from "node:crypto";
import { createIfoodApiClient } from "@/features/ifood/ifood-api.client";
import { ensureActiveIfoodConnection } from "@/features/ifood/ifood-connection.repository";
import { readIfoodEnv } from "@/features/ifood/ifood-env";
import { runIfoodPollCycle } from "@/features/ifood/ifood-poller.service";
import { prisma } from "@/lib/prisma";

const POLL_INTERVAL_MS = 30_000;

export type RunIfoodPollerOptions = {
  once?: boolean;
  env?: NodeJS.ProcessEnv;
  lockedBy?: string;
};

/**
 * Manual/one-shot or 30s loop poller for the test-app connection.
 */
export async function runIfoodPoller(
  options: RunIfoodPollerOptions = {},
): Promise<void> {
  const envConfig = readIfoodEnv(options.env ?? process.env);
  const api = createIfoodApiClient({
    clientId: envConfig.clientId,
    clientSecret: envConfig.clientSecret,
  });
  const lockedBy = options.lockedBy ?? `poller-${randomUUID()}`;

  const connection = await ensureActiveIfoodConnection(prisma, {
    storeSlug: envConfig.storeSlug,
    merchantId: envConfig.merchantId,
  });

  const tick = async () => {
    const result = await runIfoodPollCycle({
      prisma,
      api,
      connection,
      lockedBy,
    });
    console.info(
      JSON.stringify({
        scope: "ifood-poller",
        ...result,
        at: new Date().toISOString(),
      }),
    );
    return result;
  };

  await tick();
  if (options.once) {
    return;
  }

  // Keep presence alive: poll every 30s (iFood improper-use policy).
  for (;;) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, POLL_INTERVAL_MS);
    });
    await tick();
  }
}
