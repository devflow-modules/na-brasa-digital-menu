/**
 * Safe Neon restore drill helper (PPR-05 / issue #109).
 *
 * Creates a temporary branch from a past timestamp, runs SELECT 1,
 * then deletes the branch. Never modifies the production branch tip
 * and never prints connection strings or API keys.
 *
 * Required env (local shell only — never commit):
 *   NEON_API_KEY
 *   NEON_PROJECT_ID
 *   NEON_PARENT_BRANCH_ID  (root/production branch id)
 *
 * Optional:
 *   NEON_RESTORE_MINUTES_AGO  (default 120)
 */

const NEON_API = "https://console.neon.tech/api/v2";

type NeonBranchCreateResponse = {
  branch?: { id?: string; name?: string };
  endpoints?: Array<{ host?: string; id?: string }>;
  connection_uris?: Array<{ connection_uri?: string }>;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in the local shell only. See docs/operations/database-backup-and-restore.md`,
    );
  }
  return value;
}

function minutesAgoIso(minutes: number): string {
  const date = new Date(Date.now() - minutes * 60_000);
  return date.toISOString();
}

async function neonFetch(
  path: string,
  apiKey: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${NEON_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function main(): Promise<void> {
  const apiKey = requireEnv("NEON_API_KEY");
  const projectId = requireEnv("NEON_PROJECT_ID");
  const parentBranchId = requireEnv("NEON_PARENT_BRANCH_ID");
  const minutesAgo = Number(process.env.NEON_RESTORE_MINUTES_AGO ?? "120");
  if (!Number.isFinite(minutesAgo) || minutesAgo < 5) {
    throw new Error("NEON_RESTORE_MINUTES_AGO must be a number >= 5");
  }

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
    .slice(0, 15);
  const branchName = `restore-drill-${stamp}`;
  const parentTimestamp = minutesAgoIso(minutesAgo);

  console.log("Starting Neon restore drill (non-destructive).");
  console.log(`project=${projectId}`);
  console.log(`parent_branch=${parentBranchId}`);
  console.log(`parent_timestamp=${parentTimestamp}`);
  console.log(`drill_branch=${branchName}`);

  const createRes = await neonFetch(`/projects/${projectId}/branches`, apiKey, {
    method: "POST",
    body: JSON.stringify({
      branch: {
        name: branchName,
        parent_id: parentBranchId,
        parent_timestamp: parentTimestamp,
      },
      endpoints: [{ type: "read_write" }],
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(
      `Branch create failed (${createRes.status}). Check PITR window / IDs. Detail length=${body.length}`,
    );
  }

  const created = (await createRes.json()) as NeonBranchCreateResponse;
  const drillBranchId = created.branch?.id;
  const connectionUri = created.connection_uris?.[0]?.connection_uri;

  if (!drillBranchId) {
    throw new Error("Branch create response missing branch.id");
  }
  if (!connectionUri) {
    throw new Error(
      "Branch create response missing connection_uris[0].connection_uri",
    );
  }

  console.log(`created_branch_id=${drillBranchId}`);

  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = connectionUri;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1::int AS ok`;
    if (rows[0]?.ok !== 1) {
      throw new Error("SELECT 1 validation failed on drill branch");
    }
    console.log("validation=SELECT_1_ok");
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }

  const deleteRes = await neonFetch(
    `/projects/${projectId}/branches/${drillBranchId}`,
    apiKey,
    { method: "DELETE" },
  );
  if (!deleteRes.ok) {
    throw new Error(
      `Failed to delete drill branch ${drillBranchId} (${deleteRes.status}). Delete it manually in Neon Console.`,
    );
  }

  console.log("drill_branch_deleted=true");
  console.log("production_modified=false");
  console.log(
    "Next: fill the drill register in docs/operations/database-backup-and-restore.md and update PPR-04/05.",
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
