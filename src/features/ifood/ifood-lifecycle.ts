/**
 * Advance IfoodOrder lifecycle only by event time, with deterministic id tie-break.
 * Never trust poll array order.
 */
export function shouldAdvanceIfoodLifecycle(
  existing: {
    lastEventAt: Date | null;
    lastExternalEventId: string | null;
  } | null,
  eventAt: Date,
  externalEventId: string,
): boolean {
  if (!existing?.lastEventAt) {
    return true;
  }
  const existingMs = existing.lastEventAt.getTime();
  const eventMs = eventAt.getTime();
  if (eventMs > existingMs) {
    return true;
  }
  if (eventMs < existingMs) {
    return false;
  }
  const prevId = existing.lastExternalEventId ?? "";
  return externalEventId.localeCompare(prevId) > 0;
}

export function compareIfoodPollingEvents(
  a: { id: string; createdAt?: string },
  b: { id: string; createdAt?: string },
): number {
  const aMs = parseEventCreatedAtMs(a.createdAt);
  const bMs = parseEventCreatedAtMs(b.createdAt);
  if (aMs !== bMs) {
    return aMs - bMs;
  }
  return a.id.localeCompare(b.id);
}

function parseEventCreatedAtMs(createdAt?: string): number {
  if (!createdAt) {
    return Number.POSITIVE_INFINITY;
  }
  const ms = new Date(createdAt).getTime();
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}
