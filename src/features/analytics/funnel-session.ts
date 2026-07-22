import { FUNNEL_SESSION_STORAGE_KEY } from "@/features/analytics/funnel-event-names";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Extremely rare fallback — still UUID-shaped for schema validation.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const r = (Math.random() * 16) | 0;
    const v = char === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Anonymous storefront session id (localStorage). Never contains PII. */
export function getOrCreateFunnelSessionId(): string {
  if (typeof window === "undefined") {
    return createSessionId();
  }

  try {
    const existing = window.localStorage.getItem(FUNNEL_SESSION_STORAGE_KEY);
    if (existing && UUID_RE.test(existing)) {
      return existing;
    }
    const created = createSessionId();
    window.localStorage.setItem(FUNNEL_SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return createSessionId();
  }
}
