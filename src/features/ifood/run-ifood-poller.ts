import { randomUUID } from "node:crypto";
import { createIfoodApiClient } from "@/features/ifood/ifood-api.client";
import {
  ensureIfoodConnection,
  loadIfoodConnection,
} from "@/features/ifood/ifood-connection.repository";
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
 * Loop stops on SIGTERM/SIGINT. Inactive connections are not polled.
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

  const ensured = await ensureIfoodConnection(prisma, {
    storeSlug: envConfig.storeSlug,
    merchantId: envConfig.merchantId,
  });

  let stopping = false;
  const onStop = () => {
    stopping = true;
  };
  process.once("SIGTERM", onStop);
  process.once("SIGINT", onStop);

  const tick = async () => {
    const connection = await loadIfoodConnection(prisma, ensured.id);
    if (!connection) {
      console.info(
        JSON.stringify({
          scope: "ifood-poller",
          connectionId: ensured.id,
          skippedMissing: true,
          at: new Date().toISOString(),
        }),
      );
      return null;
    }

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

  try {
    await tick();
    if (options.once) {
      return;
    }

    // Keep presence alive: poll every 30s (iFood improper-use policy).
    for (;;) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
      if (stopping) {
        console.info(
          JSON.stringify({
            scope: "ifood-poller",
            stopping: true,
            at: new Date().toISOString(),
          }),
        );
        break;
      }
      await tick();
    }
  } finally {
    process.off("SIGTERM", onStop);
    process.off("SIGINT", onStop);
  }
}
