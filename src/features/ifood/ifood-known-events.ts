/**
 * Lifecycle codes we actively handle (snapshot refresh).
 * Anything else is persisted and left PENDING (unprocessed).
 */
export const IFOOD_KNOWN_FULL_CODES = new Set([
  "PLACED",
  "CONFIRMED",
  "INTEGRATED",
  "CANCELLED",
  "CANCELLATION_REQUESTED",
  "CANCELLATION_REQUEST_FAILED",
  "READY_TO_PICKUP",
  "DISPATCHED",
  "CONCLUDED",
  "PICKUP_AREA_ASSIGNED",
  "START_PREPARATION",
]);

export function normalizeIfoodFullCode(
  code?: string | null,
  fullCode?: string | null,
): string | null {
  const raw = (fullCode ?? code ?? "").trim();
  if (!raw) {
    return null;
  }
  const upper = raw.toUpperCase();
  // Short codes sometimes arrive instead of fullCode.
  if (upper === "PLC") return "PLACED";
  if (upper === "CFM") return "CONFIRMED";
  if (upper === "CAN") return "CANCELLED";
  return upper;
}

export function isKnownIfoodFullCode(fullCode: string | null): boolean {
  return fullCode != null && IFOOD_KNOWN_FULL_CODES.has(fullCode);
}
