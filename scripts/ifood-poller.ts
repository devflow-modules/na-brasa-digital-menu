/**
 * iFood test-app poller (#120).
 *
 * Env:
 *   IFOOD_CLIENT_ID
 *   IFOOD_CLIENT_SECRET
 *   IFOOD_TEST_MERCHANT_ID
 *   IFOOD_TEST_STORE_SLUG (optional; defaults to NEXT_PUBLIC_STORE_SLUG / na-brasa)
 *
 * Usage:
 *   pnpm ifood:poll -- --once
 *   pnpm ifood:poll
 */
import { runIfoodPoller } from "@/features/ifood/run-ifood-poller";
import { prisma } from "@/lib/prisma";

async function main() {
  const once =
    process.argv.includes("--once") ||
    process.env.IFOOD_POLLER_ONCE === "true";

  try {
    await runIfoodPoller({ once });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(
    JSON.stringify({
      scope: "ifood-poller",
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  await prisma.$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
