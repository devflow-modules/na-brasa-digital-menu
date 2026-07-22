import { z } from "zod";
import { CLIENT_FUNNEL_EVENT_NAMES } from "@/features/analytics/funnel-event-names";

const clientFunnelEventNameSchema = z.enum(CLIENT_FUNNEL_EVENT_NAMES);

/**
 * Public client ingest payload.
 * Clients must NOT send storeId or dedupeKey — both are resolved server-side.
 */
export const clientFunnelEventIngestSchema = z
  .object({
    storeSlug: z.string().trim().min(1).max(64),
    name: clientFunnelEventNameSchema,
    sessionId: z.string().uuid(),
    productId: z.string().trim().min(1).max(128).optional(),
    quantity: z.number().int().min(1).max(99).optional(),
    /** Required for product_added — unique per add occurrence. */
    occurrenceId: z.string().uuid().optional(),
    /** Required for whatsapp_handoff_started. */
    orderId: z.string().trim().min(1).max(128).optional(),
    clientOccurredAt: z.string().trim().min(1).max(64).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.name === "product_added") {
      if (!data.productId) {
        ctx.addIssue({
          code: "custom",
          path: ["productId"],
          message: "productId is required",
        });
      }
      if (!data.occurrenceId) {
        ctx.addIssue({
          code: "custom",
          path: ["occurrenceId"],
          message: "occurrenceId is required",
        });
      }
    }

    if (data.name === "whatsapp_handoff_started" && !data.orderId) {
      ctx.addIssue({
        code: "custom",
        path: ["orderId"],
        message: "orderId is required",
      });
    }

    if (data.name !== "product_added") {
      if (data.productId != null) {
        ctx.addIssue({
          code: "custom",
          path: ["productId"],
          message: "productId is not allowed for this event",
        });
      }
      if (data.quantity != null) {
        ctx.addIssue({
          code: "custom",
          path: ["quantity"],
          message: "quantity is not allowed for this event",
        });
      }
      if (data.occurrenceId != null) {
        ctx.addIssue({
          code: "custom",
          path: ["occurrenceId"],
          message: "occurrenceId is not allowed for this event",
        });
      }
    }

    if (data.name !== "whatsapp_handoff_started" && data.orderId != null) {
      ctx.addIssue({
        code: "custom",
        path: ["orderId"],
        message: "orderId is not allowed for this event",
      });
    }
  });

export type ClientFunnelEventIngestInput = z.infer<
  typeof clientFunnelEventIngestSchema
>;

export function parseClientFunnelEventIngest(
  input: unknown,
): ClientFunnelEventIngestInput {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Client funnel event must be an object");
  }

  const record = input as Record<string, unknown>;
  if ("storeId" in record || "dedupeKey" in record) {
    throw new Error("storeId and dedupeKey are server-resolved only");
  }

  for (const key of Object.keys(record)) {
    if (
      key === "customerName" ||
      key === "customerPhone" ||
      key === "phone" ||
      key === "email" ||
      key === "address" ||
      key === "deliveryAddress" ||
      key === "whatsappMessage" ||
      key === "notes"
    ) {
      throw new Error(`Forbidden funnel property: ${key}`);
    }
  }

  return clientFunnelEventIngestSchema.parse(record);
}
