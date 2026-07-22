import type { IfoodConnection, Prisma, PrismaClient } from "@prisma/client";
import type { IfoodApiClient, IfoodPollingEvent } from "@/features/ifood/ifood-api.client";
import {
  acquireIfoodPollLock,
  releaseIfoodPollLock,
} from "@/features/ifood/ifood-connection.repository";
import {
  isKnownIfoodFullCode,
  normalizeIfoodFullCode,
} from "@/features/ifood/ifood-known-events";
import {
  compareIfoodPollingEvents,
  shouldAdvanceIfoodLifecycle,
} from "@/features/ifood/ifood-lifecycle";
import { correlateIfoodCommandFromEvent } from "@/features/ifood/ifood-order-command.service";
import { syncIfoodOperationalProjection } from "@/features/ifood/ifood-order-projection.service";

export type IfoodPollCycleResult = {
  connectionId: string;
  merchantId: string;
  locked: boolean;
  skippedInactive: boolean;
  polled: number;
  persistedNew: number;
  duplicates: number;
  rejectedMerchantMismatch: number;
  acknowledged: number;
  processed: number;
  leftPendingUnknown: number;
  failedProcessing: number;
};

function eventCreatedAt(event: IfoodPollingEvent): Date | null {
  if (!event.createdAt || typeof event.createdAt !== "string") {
    return null;
  }
  const date = new Date(event.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function displayIdFromSnapshot(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  const displayId = (snapshot as { displayId?: unknown }).displayId;
  return typeof displayId === "string" ? displayId : null;
}

/**
 * One poll cycle for a single connection.
 * Persist-before-ACK; ACK only ids that were durable (new or already stored).
 * Inactive connections are not polled.
 */
export async function runIfoodPollCycle(options: {
  prisma: PrismaClient;
  api: IfoodApiClient;
  connection: IfoodConnection;
  lockedBy: string;
  now?: Date;
  syncOperationalProjection?: typeof syncIfoodOperationalProjection;
}): Promise<IfoodPollCycleResult> {
  const now = options.now ?? new Date();
  const { prisma, api, connection, lockedBy } = options;
  const syncOperationalProjection =
    options.syncOperationalProjection ?? syncIfoodOperationalProjection;

  const result: IfoodPollCycleResult = {
    connectionId: connection.id,
    merchantId: connection.merchantId,
    locked: false,
    skippedInactive: false,
    polled: 0,
    persistedNew: 0,
    duplicates: 0,
    rejectedMerchantMismatch: 0,
    acknowledged: 0,
    processed: 0,
    leftPendingUnknown: 0,
    failedProcessing: 0,
  };

  if (!connection.isActive) {
    result.skippedInactive = true;
    return result;
  }

  const locked = await acquireIfoodPollLock(
    prisma,
    connection.id,
    lockedBy,
    now,
  );
  if (!locked) {
    return result;
  }
  result.locked = true;

  try {
    const auth = await api.authenticate();
    const events = (await api.pollEvents(
      auth.accessToken,
      connection.merchantId,
    )).slice().sort(compareIfoodPollingEvents);
    result.polled = events.length;

    const ackIds: string[] = [];

    for (const event of events) {
      if (!event.id) {
        continue;
      }

      const eventMerchantId =
        typeof event.merchantId === "string" ? event.merchantId : null;
      if (
        eventMerchantId != null &&
        eventMerchantId !== connection.merchantId
      ) {
        result.rejectedMerchantMismatch += 1;
        // Do not persist or ACK foreign merchant events.
        continue;
      }

      const fullCode = normalizeIfoodFullCode(event.code, event.fullCode);
      const externalOrderId =
        typeof event.orderId === "string" ? event.orderId : null;

      let durable = false;
      let isDuplicate = false;

      try {
        await prisma.ifoodEvent.create({
          data: {
            connectionId: connection.id,
            storeId: connection.storeId,
            externalEventId: event.id,
            code: typeof event.code === "string" ? event.code : null,
            fullCode,
            externalOrderId,
            merchantId: connection.merchantId,
            payload: event as Prisma.InputJsonValue,
            receivedAt: now,
            processingStatus: "PENDING",
          },
        });
        durable = true;
        result.persistedNew += 1;
      } catch (error) {
        // Unique violation → already persisted → still ACK.
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code)
            : "";
        if (code === "P2002") {
          durable = true;
          isDuplicate = true;
          result.duplicates += 1;
        } else {
          // Persist failed — do not ACK this event.
          continue;
        }
      }

      if (!durable) {
        continue;
      }

      ackIds.push(event.id);

      if (isDuplicate) {
        // Already handled in a prior cycle; skip reprocessing noise.
        continue;
      }

      if (!isKnownIfoodFullCode(fullCode)) {
        result.leftPendingUnknown += 1;
        continue;
      }

      try {
        if (externalOrderId) {
          const eventAt = eventCreatedAt(event) ?? now;
          const existing = await prisma.ifoodOrder.findUnique({
            where: {
              connectionId_externalOrderId: {
                connectionId: connection.id,
                externalOrderId,
              },
            },
          });

          const shouldAdvance = shouldAdvanceIfoodLifecycle(
            existing
              ? {
                  lastEventAt: existing.lastEventAt,
                  lastExternalEventId: existing.lastExternalEventId,
                }
              : null,
            eventAt,
            event.id,
          );

          const snapshot = await api.getOrder(
            auth.accessToken,
            externalOrderId,
          );

          await prisma.ifoodOrder.upsert({
            where: {
              connectionId_externalOrderId: {
                connectionId: connection.id,
                externalOrderId,
              },
            },
            create: {
              connectionId: connection.id,
              storeId: connection.storeId,
              externalOrderId,
              displayId: displayIdFromSnapshot(snapshot),
              lastEventFullCode: fullCode,
              lastEventAt: eventAt,
              lastExternalEventId: event.id,
              snapshot: snapshot as Prisma.InputJsonValue,
              snapshotFetchedAt: now,
            },
            update: {
              displayId: displayIdFromSnapshot(snapshot),
              snapshot: snapshot as Prisma.InputJsonValue,
              snapshotFetchedAt: now,
              ...(shouldAdvance
                ? {
                    lastEventFullCode: fullCode,
                    lastEventAt: eventAt,
                    lastExternalEventId: event.id,
                  }
                : {}),
            },
          });

          await correlateIfoodCommandFromEvent({
            prisma,
            connectionId: connection.id,
            externalOrderId,
            externalEventId: event.id,
            fullCode,
            eventAt,
            receivedAt: now,
          });

          // Projection must not break inbox/ACK; retry on later events.
          try {
            await syncOperationalProjection({
              prisma,
              connectionId: connection.id,
              externalOrderId,
            });
          } catch {
            console.error(
              "[runIfoodPollCycle] operational projection failed; inbox kept",
            );
          }
        }

        await prisma.ifoodEvent.update({
          where: {
            connectionId_externalEventId: {
              connectionId: connection.id,
              externalEventId: event.id,
            },
          },
          data: {
            processingStatus: "PROCESSED",
            processedAt: now,
            processingError: null,
          },
        });
        result.processed += 1;
      } catch (error) {
        // Detail fetch/update failed — event stays durable (FAILED), still ACKed.
        result.failedProcessing += 1;
        await prisma.ifoodEvent.update({
          where: {
            connectionId_externalEventId: {
              connectionId: connection.id,
              externalEventId: event.id,
            },
          },
          data: {
            processingStatus: "FAILED",
            processedAt: now,
            processingError:
              error instanceof Error ? error.message.slice(0, 500) : "failed",
          },
        });
      }
    }

    if (ackIds.length > 0) {
      await api.acknowledge(auth.accessToken, ackIds);
      await prisma.ifoodEvent.updateMany({
        where: {
          connectionId: connection.id,
          externalEventId: { in: ackIds },
          acknowledgedAt: null,
        },
        data: { acknowledgedAt: now },
      });
      result.acknowledged = ackIds.length;
    }

    return result;
  } finally {
    await releaseIfoodPollLock(prisma, connection.id, lockedBy, now);
  }
}
