import { randomUUID } from "node:crypto";

export type OpsLogLevel = "info" | "warn" | "error";

export type OpsLogFields = {
  scope: string;
  level: OpsLogLevel;
  message: string;
  orderId?: string;
  storeId?: string;
  /** Safe operational code only (e.g. status name, error bucket) — never raw user input. */
  code?: string;
};

const MAX_MESSAGE_LENGTH = 200;

export type OpsLogEntry = {
  eventId: string;
  scope: string;
  level: OpsLogLevel;
  at: string;
  message: string;
  orderId?: string;
  storeId?: string;
  code?: string;
};

function sanitizeMessage(raw: string): string {
  let message = raw.replace(/\s+/g, " ").trim();
  if (message.length > MAX_MESSAGE_LENGTH) {
    message = `${message.slice(0, MAX_MESSAGE_LENGTH - 3)}...`;
  }
  return message;
}

export function buildOpsLogEntry(fields: OpsLogFields): OpsLogEntry {
  const entry: OpsLogEntry = {
    eventId: randomUUID(),
    scope: fields.scope,
    level: fields.level,
    at: new Date().toISOString(),
    message: sanitizeMessage(fields.message),
  };
  if (fields.orderId) {
    entry.orderId = fields.orderId;
  }
  if (fields.storeId) {
    entry.storeId = fields.storeId;
  }
  if (fields.code) {
    entry.code = fields.code.slice(0, 64);
  }
  return entry;
}

export function writeOpsLog(fields: OpsLogFields): OpsLogEntry {
  const entry = buildOpsLogEntry(fields);
  console.log(JSON.stringify(entry));
  return entry;
}

export function logOpsInfo(
  fields: Omit<OpsLogFields, "level">,
): OpsLogEntry {
  return writeOpsLog({ ...fields, level: "info" });
}

export function logOpsWarn(
  fields: Omit<OpsLogFields, "level">,
): OpsLogEntry {
  return writeOpsLog({ ...fields, level: "warn" });
}

export function logOpsError(
  fields: Omit<OpsLogFields, "level">,
): OpsLogEntry {
  return writeOpsLog({ ...fields, level: "error" });
}
