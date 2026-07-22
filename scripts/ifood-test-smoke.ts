/**
 * One-shot smoke against iFood test app credentials.
 * Does NOT mutate the product Order domain.
 *
 * Reads from .env:
 *   IFOOD_CLIENT_ID
 *   IFOOD_CLIENT_SECRET
 *   IFOOD_TEST_MERCHANT_ID
 *
 * Optional:
 *   IFOOD_TEST_ORDER_ID (default: known generated test order)
 *
 * Run: pnpm exec tsx scripts/ifood-test-smoke.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const AUTH_URL =
  "https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token";
/** Primary paths from current Events module docs. */
const POLL_URL =
  "https://merchant-api.ifood.com.br/events/v1.0/events:polling";
const ACK_URL =
  "https://merchant-api.ifood.com.br/events/v1.0/events/acknowledgment";
const ORDER_URL =
  "https://merchant-api.ifood.com.br/order/v1.0/orders";

/** Legacy/alternate paths some guides still mention. */
const POLL_URL_ALT =
  "https://merchant-api.ifood.com.br/order/v1.0/events:polling";
const ACK_URL_ALT =
  "https://merchant-api.ifood.com.br/order/v1.0/events/acknowledgment";

const DEFAULT_TEST_ORDER_ID = "2e159da9-4606-4662-aad2-780e2162540d";

type EnvMap = Record<string, string | undefined>;

function loadDotEnv(filePath: string): EnvMap {
  const out: EnvMap = {};
  if (!existsSync(filePath)) {
    return out;
  }
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function requireEnv(env: EnvMap, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing ${key} in .env`);
  }
  return value;
}

function maskId(id: string): string {
  if (id.length <= 8) return "***";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

async function authenticate(clientId: string, clientSecret: string) {
  const body = new URLSearchParams({
    grantType: "client_credentials",
    clientId,
    clientSecret,
  });

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Auth non-JSON (${response.status}): ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(
      `Auth failed (${response.status}): ${JSON.stringify(json).slice(0, 300)}`,
    );
  }

  const record = json as { accessToken?: string; expiresIn?: number };
  if (!record.accessToken) {
    throw new Error("Auth response missing accessToken");
  }

  return {
    accessToken: record.accessToken,
    expiresIn: record.expiresIn ?? null,
  };
}

type IfoodEvent = {
  id: string;
  code?: string;
  fullCode?: string;
  orderId?: string;
  merchantId?: string;
  createdAt?: string;
  [key: string]: unknown;
};

async function pollEvents(
  accessToken: string,
  merchantId: string,
  pollUrl: string,
): Promise<{ url: string; status: number; events: IfoodEvent[] }> {
  const url = `${pollUrl}?categories=FOOD`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-polling-merchants": merchantId,
    },
  });

  if (response.status === 204) {
    return { url: pollUrl, status: 204, events: [] };
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Polling failed on ${pollUrl} (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  const parsed = text ? (JSON.parse(text) as IfoodEvent[]) : [];
  return {
    url: pollUrl,
    status: response.status,
    events: Array.isArray(parsed) ? parsed : [],
  };
}

async function acknowledge(
  accessToken: string,
  eventIds: string[],
  ackUrl: string,
) {
  const response = await fetch(ackUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventIds.map((id) => ({ id }))),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `ACK failed on ${ackUrl} (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  return { status: response.status, body: text.slice(0, 200) };
}

async function getOrder(accessToken: string, orderId: string) {
  const response = await fetch(`${ORDER_URL}/${orderId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: response.status, body: json };
}

function sanitizeEvent(event: IfoodEvent) {
  return {
    id: event.id,
    code: event.code ?? event.fullCode ?? null,
    orderId: event.orderId ?? null,
    merchantId: event.merchantId ?? null,
    createdAt: event.createdAt ?? null,
  };
}

async function main() {
  const env = { ...loadDotEnv(path.resolve(".env")), ...process.env };
  const clientId = requireEnv(env, "IFOOD_CLIENT_ID");
  const clientSecret = requireEnv(env, "IFOOD_CLIENT_SECRET");
  const merchantId = requireEnv(env, "IFOOD_TEST_MERCHANT_ID");
  const expectedOrderId =
    env.IFOOD_TEST_ORDER_ID?.trim() || DEFAULT_TEST_ORDER_ID;

  console.log(
    JSON.stringify(
      {
        step: "env",
        clientId: maskId(clientId),
        merchantId,
        expectedOrderId,
      },
      null,
      2,
    ),
  );

  const auth = await authenticate(clientId, clientSecret);
  console.log(
    JSON.stringify(
      {
        step: "auth",
        ok: true,
        expiresIn: auth.expiresIn,
        tokenLen: auth.accessToken.length,
      },
      null,
      2,
    ),
  );

  let pollResult: { url: string; status: number; events: IfoodEvent[] };
  try {
    pollResult = await pollEvents(auth.accessToken, merchantId, POLL_URL);
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          step: "poll_primary_failed",
          error: error instanceof Error ? error.message : String(error),
          trying: POLL_URL_ALT,
        },
        null,
        2,
      ),
    );
    pollResult = await pollEvents(auth.accessToken, merchantId, POLL_URL_ALT);
  }

  const events = pollResult.events;
  const placed = events.filter(
    (event) =>
      (event.code === "PLC" ||
        event.fullCode === "PLACED" ||
        event.code === "PLACED") &&
      event.orderId === expectedOrderId,
  );
  const anyForOrder = events.filter(
    (event) => event.orderId === expectedOrderId,
  );

  const outDir = path.resolve(".local", "ifood-smoke");
  mkdirSync(outDir, { recursive: true });
  const inboxPath = path.join(outDir, `inbox-${Date.now()}.json`);
  const inbox = {
    receivedAt: new Date().toISOString(),
    merchantId,
    pollUrl: pollResult.url,
    pollStatus: pollResult.status,
    eventCount: events.length,
    events: events.map((event) => ({
      ...sanitizeEvent(event),
      // Keep raw for debugging locally; do not commit .local/
      raw: event,
    })),
  };
  writeFileSync(inboxPath, JSON.stringify(inbox, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        step: "poll",
        ok: true,
        pollUrl: pollResult.url,
        status: pollResult.status,
        eventCount: events.length,
        codes: events.map(
          (event) => event.fullCode ?? event.code ?? "UNKNOWN",
        ),
        expectedOrderMatches: anyForOrder.length,
        placedMatches: placed.length,
        inboxPath,
      },
      null,
      2,
    ),
  );

  if (events.length === 0) {
    console.log(
      JSON.stringify(
        {
          step: "done",
          verdict: "PARTIAL",
          note: "Auth OK; polling returned 0 events (204/empty). Generate a new test order or keep polling every 30s.",
        },
        null,
        2,
      ),
    );
    return;
  }

  // Persist-before-ACK already done via inbox file.
  const ackUrl = pollResult.url.includes("/events/v1.0/")
    ? ACK_URL
    : ACK_URL_ALT;
  const ack = await acknowledge(
    auth.accessToken,
    events.map((event) => event.id),
    ackUrl,
  );

  console.log(
    JSON.stringify(
      {
        step: "ack",
        ok: true,
        ackUrl,
        status: ack.status,
        acknowledged: events.length,
      },
      null,
      2,
    ),
  );

  const orderIdForGet =
    placed[0]?.orderId ?? anyForOrder[0]?.orderId ?? expectedOrderId;
  const order = await getOrder(auth.accessToken, orderIdForGet);
  const orderSummary =
    order.body && typeof order.body === "object"
      ? {
          id: (order.body as { id?: string }).id ?? null,
          displayId: (order.body as { displayId?: string }).displayId ?? null,
          orderType: (order.body as { orderType?: string }).orderType ?? null,
          timing: (order.body as { timing?: string }).timing ?? null,
        }
      : null;

  const orderPath = path.join(outDir, `order-${orderIdForGet}.json`);
  writeFileSync(orderPath, JSON.stringify(order.body, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        step: "get_order",
        ok: order.status >= 200 && order.status < 300,
        status: order.status,
        orderId: orderIdForGet,
        summary: orderSummary,
        orderPath,
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      {
        step: "done",
        verdict:
          order.status >= 200 && order.status < 300 ? "GO" : "PARTIAL",
        note: "Auth + poll + durable local inbox + ACK + GET order completed. No product Order domain changes.",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        verdict: "NO-GO",
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
