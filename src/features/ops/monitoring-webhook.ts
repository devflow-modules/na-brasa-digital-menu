import type { OpsLogEntry } from "@/features/ops/ops-log";
import { writeOpsLog, type OpsLogFields } from "@/features/ops/ops-log";

const WEBHOOK_TIMEOUT_MS = 2500;

function formatWebhookText(
  entry: Pick<
    OpsLogEntry,
    | "scope"
    | "level"
    | "message"
    | "code"
    | "orderId"
    | "storeId"
    | "eventId"
    | "at"
  >,
): string {
  const parts = [`[${entry.level.toUpperCase()}] ${entry.scope}`, entry.message];
  if (entry.code) {
    parts.push(`code=${entry.code}`);
  }
  if (entry.orderId) {
    parts.push(`orderId=${entry.orderId}`);
  }
  if (entry.storeId) {
    parts.push(`storeId=${entry.storeId}`);
  }
  parts.push(`eventId=${entry.eventId}`);
  parts.push(`at=${entry.at}`);
  return parts.join(" | ");
}

function buildWebhookBody(url: string, text: string): string {
  const trimmed = text.slice(0, 2000);
  if (url.includes("discord.com/api/webhooks")) {
    return JSON.stringify({ content: trimmed });
  }
  return JSON.stringify({ text: trimmed.slice(0, 4000) });
}

/**
 * Best-effort alert for critical errors. Never throws into business flow.
 */
export async function notifyMonitoringWebhook(
  entry: OpsLogEntry,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const url = env.MONITORING_WEBHOOK_URL?.trim();
  if (!url) {
    return;
  }

  const body = buildWebhookBody(url, formatWebhookText(entry));

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Webhook failure must not affect callers.
  }
}

/**
 * Structured error log + optional MONITORING_WEBHOOK_URL notification.
 */
export async function logOpsCriticalError(
  fields: Omit<OpsLogFields, "level">,
  env: NodeJS.ProcessEnv = process.env,
): Promise<OpsLogEntry> {
  const entry = writeOpsLog({ ...fields, level: "error" });
  await notifyMonitoringWebhook(entry, env);
  return entry;
}
