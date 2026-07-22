import { z } from "zod";
import {
  FUNNEL_EVENT_ALLOWED_INPUT_KEYS,
  FUNNEL_EVENT_FORBIDDEN_PROPERTY_KEYS,
  FUNNEL_EVENT_NAMES,
} from "@/features/analytics/funnel-event-names";

const funnelEventNameSchema = z.enum(FUNNEL_EVENT_NAMES);

const orderSourceSchema = z.enum(["DIRECT", "IFOOD", "OTHER", "COUNTER"]);

const optionalId = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .optional()
  .nullable();

/**
 * Explicit property allowlist for funnel event recording.
 * Unknown keys and forbidden PII-like keys are rejected before persistence.
 */
export const recordFunnelEventInputSchema = z
  .object({
    storeId: z.string().trim().min(1).max(128),
    name: funnelEventNameSchema,
    dedupeKey: z.string().trim().min(1).max(256),
    sessionId: optionalId,
    orderId: optionalId,
    productId: optionalId,
    source: orderSourceSchema.optional().nullable(),
    quantity: z
      .number()
      .int()
      .min(1)
      .max(99)
      .optional()
      .nullable(),
    /** Untrusted client clock — stored only as clientOccurredAt. */
    clientOccurredAt: z
      .union([z.date(), z.string().trim().min(1).max(64)])
      .optional()
      .nullable(),
  })
  .strict();

export type RecordFunnelEventInput = z.infer<typeof recordFunnelEventInputSchema>;

export type ParsedFunnelEventInput = {
  storeId: string;
  name: z.infer<typeof funnelEventNameSchema>;
  dedupeKey: string;
  sessionId: string | null;
  orderId: string | null;
  productId: string | null;
  source: z.infer<typeof orderSourceSchema> | null;
  quantity: number | null;
  clientOccurredAt: Date | null;
};

export function assertNoForbiddenFunnelKeys(
  input: Record<string, unknown>,
): void {
  for (const key of Object.keys(input)) {
    if (
      (FUNNEL_EVENT_FORBIDDEN_PROPERTY_KEYS as readonly string[]).includes(key)
    ) {
      throw new Error(`Forbidden funnel property: ${key}`);
    }
    if (
      !(FUNNEL_EVENT_ALLOWED_INPUT_KEYS as readonly string[]).includes(key)
    ) {
      throw new Error(`Unknown funnel property: ${key}`);
    }
  }
}

export function parseRecordFunnelEventInput(
  input: unknown,
): ParsedFunnelEventInput {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Funnel event input must be an object");
  }

  const record = input as Record<string, unknown>;
  assertNoForbiddenFunnelKeys(record);

  const parsed = recordFunnelEventInputSchema.parse(record);

  let clientOccurredAt: Date | null = null;
  if (parsed.clientOccurredAt != null) {
    clientOccurredAt =
      parsed.clientOccurredAt instanceof Date
        ? parsed.clientOccurredAt
        : new Date(parsed.clientOccurredAt);
    if (Number.isNaN(clientOccurredAt.getTime())) {
      clientOccurredAt = null;
    }
  }

  return {
    storeId: parsed.storeId,
    name: parsed.name,
    dedupeKey: parsed.dedupeKey,
    sessionId: parsed.sessionId ?? null,
    orderId: parsed.orderId ?? null,
    productId: parsed.productId ?? null,
    source: parsed.source ?? null,
    quantity: parsed.quantity ?? null,
    clientOccurredAt,
  };
}
