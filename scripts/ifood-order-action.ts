/**
 * Manual iFood test-app order action (#122).
 *
 * Usage:
 *   pnpm ifood:order-action -- --order-id <uuid> --action confirm
 *   pnpm ifood:order-action -- --order-id <uuid> --action start-preparation
 *   pnpm ifood:order-action -- --order-id <uuid> --action terminal
 */
import type { IfoodOrderCommandType } from "@prisma/client";
import { createIfoodApiClient } from "@/features/ifood/ifood-api.client";
import { ensureIfoodConnection } from "@/features/ifood/ifood-connection.repository";
import { readIfoodEnv } from "@/features/ifood/ifood-env";
import {
  executeIfoodOrderCommand,
  resolveIfoodTerminalCommandForOrder,
} from "@/features/ifood/ifood-order-command.service";
import { prisma } from "@/lib/prisma";

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

async function main() {
  const externalOrderId = argument("--order-id");
  const action = argument("--action");
  if (!externalOrderId || !action) {
    throw new Error("Required: --order-id <uuid> --action confirm|start-preparation|terminal");
  }

  const env = readIfoodEnv();
  const connection = await ensureIfoodConnection(prisma, {
    storeSlug: env.storeSlug,
    merchantId: env.merchantId,
  });
  const api = createIfoodApiClient({
    clientId: env.clientId,
    clientSecret: env.clientSecret,
  });

  let command: IfoodOrderCommandType;
  if (action === "confirm") command = "CONFIRM";
  else if (action === "start-preparation") command = "START_PREPARATION";
  else if (action === "terminal") {
    command = await resolveIfoodTerminalCommandForOrder({
      prisma,
      connectionId: connection.id,
      externalOrderId,
    });
  } else {
    throw new Error(`Unsupported action: ${action}`);
  }

  const result = await executeIfoodOrderCommand({
    prisma,
    api,
    connectionId: connection.id,
    externalOrderId,
    command,
  });

  console.info(
    JSON.stringify({
      scope: "ifood-order-action",
      externalOrderId,
      ...result,
      at: new Date().toISOString(),
    }),
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify({
        scope: "ifood-order-action",
        error: error instanceof Error ? error.message : "failed",
      }),
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
