import type {
  FunnelEventName,
  OrderSource,
  OrderStatus,
  PrismaClient,
} from "@prisma/client";
import { FUNNEL_EVENT_NAMES } from "@/features/analytics/funnel-event-names";
import type { WeeklyFunnelReportPeriod } from "@/features/analytics/weekly-funnel-report-period";

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];

export type OrderStatusCountMap = Record<OrderStatus, number>;

export type NamedCount = {
  name: string;
  count: number;
};

export type ProductOperationalRow = {
  productName: string;
  quantity: number;
};

export type ProductCompletedRevenueRow = {
  productName: string;
  quantity: number;
  revenueCents: number;
};

export type TimingSummary = {
  sampleSize: number;
  medianMs: number | null;
};

/** Volume ratios (counts ÷ counts). Null when denominator is 0 — never 0%. */
export type OnlineFunnelRatios = {
  productAddedPerMenuViewed: number | null;
  checkoutStartedPerMenuViewed: number | null;
  orderCreatedDirectPerCheckoutStarted: number | null;
  whatsappHandoffPerOrderCreatedDirect: number | null;
};

export type LifecycleSourceBreakdown = {
  bySource: Record<OrderSource, number>;
  unclassified: number;
};

export type WeeklyFunnelReport = {
  store: { id: string; slug: string; name: string };
  period: WeeklyFunnelReportPeriod;
  funnelEventCounts: NamedCount[];
  onlineFunnel: {
    menuViewed: number;
    productAdded: number;
    checkoutStarted: number;
    orderCreatedDirect: number;
    whatsappHandoffStarted: number;
    /** Volume ratios only — not per-session conversion. */
    ratios: OnlineFunnelRatios;
  };
  creationCohort: {
    total: number;
    bySource: Record<OrderSource, number>;
    byStatus: OrderStatusCountMap;
    open: number;
    completed: number;
    cancelled: number;
    /** COMPLETED orders created in the period — not lifecycle events. */
    revenueCompletedCents: number;
    completedOrderCount: number;
    ticketAverageCents: number | null;
  };
  /** Lifecycle funnel rows whose occurredAt falls in the window. */
  lifecycleEventsOccurred: {
    orderConfirmed: number;
    orderCompleted: number;
    orderCancelled: number;
    bySource: {
      orderConfirmed: LifecycleSourceBreakdown;
      orderCompleted: LifecycleSourceBreakdown;
      orderCancelled: LifecycleSourceBreakdown;
    };
  };
  timing: {
    createdToConfirmed: TimingSummary;
    createdToCompleted: TimingSummary;
  };
  topProducts: {
    operationalQuantity: ProductOperationalRow[];
    completedRevenue: ProductCompletedRevenueRow[];
  };
  notes: string[];
};

type StoreRow = { id: string; slug: string; name: string };

type OrderCohortRow = {
  id: string;
  source: OrderSource;
  status: OrderStatus;
  totalCents: number;
};

type OrderItemRow = {
  orderId: string;
  productNameSnapshot: string;
  quantity: number;
  totalCents: number;
};

type FunnelCountRow = {
  name: FunnelEventName;
  _count: { _all: number };
};

type LifecycleEventRow = {
  name: FunnelEventName;
  orderId: string | null;
  source: OrderSource | null;
  occurredAt: Date;
};

type CreatedEventRow = {
  orderId: string | null;
  occurredAt: Date;
};

export type WeeklyFunnelReportDb = {
  store: {
    findUnique: (args: {
      where: { slug: string };
      select: { id: true; slug: true; name: true };
    }) => Promise<StoreRow | null>;
  };
  funnelEvent: {
    groupBy: (args: unknown) => Promise<FunnelCountRow[]>;
    findMany: (args: unknown) => Promise<LifecycleEventRow[] | CreatedEventRow[]>;
    count: (args: unknown) => Promise<number>;
  };
  order: {
    findMany: (args: unknown) => Promise<OrderCohortRow[]>;
  };
  orderItem: {
    findMany: (args: unknown) => Promise<OrderItemRow[]>;
  };
};

function emptyStatusCounts(): OrderStatusCountMap {
  return {
    PENDING: 0,
    CONFIRMED: 0,
    PREPARING: 0,
    READY: 0,
    OUT_FOR_DELIVERY: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };
}

function emptySourceCounts(): Record<OrderSource, number> {
  return { DIRECT: 0, COUNTER: 0, IFOOD: 0, OTHER: 0 };
}

function emptyLifecycleSourceBreakdown(): LifecycleSourceBreakdown {
  return { bySource: emptySourceCounts(), unclassified: 0 };
}

function formatSourceCounts(counts: Record<OrderSource, number>): string {
  return (Object.keys(counts) as OrderSource[])
    .filter((source) => counts[source] > 0 || source === "DIRECT" || source === "COUNTER")
    .map((source) => `${source}=${counts[source]}`)
    .join(" ");
}

function formatLifecycleSourceBreakdown(
  breakdown: LifecycleSourceBreakdown,
): string {
  const parts = [formatSourceCounts(breakdown.bySource)];
  if (breakdown.unclassified > 0) {
    parts.push(`unclassified=${breakdown.unclassified}`);
  }
  return parts.filter(Boolean).join(" ");
}

/** Count ÷ count; null when denominator is 0 (never coerce to 0%). */
export function safeRatio(
  numerator: number,
  denominator: number,
): number | null {
  if (denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

export function formatRatio(ratio: number | null): string {
  if (ratio == null) {
    return "n/a";
  }
  return `${(ratio * 100).toFixed(1)}%`;
}

function medianMs(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function countByName(
  rows: FunnelCountRow[],
  name: FunnelEventName,
): number {
  return rows.find((row) => row.name === name)?._count._all ?? 0;
}

function buildNotes(): string[] {
  return [
    "Window is half-open: FROM <= timestamp < TO (America/Sao_Paulo calendar days converted to UTC).",
    "Creation cohort uses Order.createdAt and current Order.status — not weekly transition counts.",
    "Lifecycle events occurred uses FunnelEvent.occurredAt for confirm/complete/cancel in the window.",
    "Revenue and ticket use creation-cohort orders currently COMPLETED only; older orders completed this week appear only under lifecycle events.",
    "Top products: operational quantity excludes CANCELLED; revenue rows are COMPLETED only (pending totals are never called revenue).",
    "whatsapp_handoff_started proves link activation, not WhatsApp delivery.",
    "Online funnel ratios are volume ratios (event counts ÷ event counts), not per-session conversion.",
    "Denominator zero yields n/a for ratios — never 0%.",
    "Lifecycle events with null source count toward totals and unclassified; they are never inferred as DIRECT.",
  ];
}

export function buildWeeklyFunnelReportFromData(input: {
  store: StoreRow;
  period: WeeklyFunnelReportPeriod;
  funnelCounts: FunnelCountRow[];
  orderCreatedDirectCount: number;
  cohortOrders: OrderCohortRow[];
  cohortItems: OrderItemRow[];
  lifecycleEvents: LifecycleEventRow[];
  createdEventsForTiming: CreatedEventRow[];
}): WeeklyFunnelReport {
  const byStatus = emptyStatusCounts();
  const bySource = emptySourceCounts();
  let open = 0;
  let completed = 0;
  let cancelled = 0;
  let revenueCompletedCents = 0;
  let completedOrderCount = 0;

  for (const order of input.cohortOrders) {
    byStatus[order.status] += 1;
    bySource[order.source] += 1;
    if (order.status === "CANCELLED") {
      cancelled += 1;
    } else if (order.status === "COMPLETED") {
      completed += 1;
      completedOrderCount += 1;
      revenueCompletedCents += order.totalCents;
    } else {
      open += 1;
    }
  }

  const nonCancelledIds = new Set(
    input.cohortOrders
      .filter((order) => order.status !== "CANCELLED")
      .map((order) => order.id),
  );
  const completedIds = new Set(
    input.cohortOrders
      .filter((order) => order.status === "COMPLETED")
      .map((order) => order.id),
  );

  const operationalMap = new Map<string, number>();
  const revenueMap = new Map<string, { quantity: number; revenueCents: number }>();

  for (const item of input.cohortItems) {
    if (nonCancelledIds.has(item.orderId)) {
      operationalMap.set(
        item.productNameSnapshot,
        (operationalMap.get(item.productNameSnapshot) ?? 0) + item.quantity,
      );
    }
    if (completedIds.has(item.orderId)) {
      const current = revenueMap.get(item.productNameSnapshot) ?? {
        quantity: 0,
        revenueCents: 0,
      };
      current.quantity += item.quantity;
      current.revenueCents += item.totalCents;
      revenueMap.set(item.productNameSnapshot, current);
    }
  }

  const operationalQuantity = [...operationalMap.entries()]
    .map(([productName, quantity]) => ({ productName, quantity }))
    .sort((a, b) => b.quantity - a.quantity || a.productName.localeCompare(b.productName))
    .slice(0, 10);

  const completedRevenue = [...revenueMap.entries()]
    .map(([productName, value]) => ({
      productName,
      quantity: value.quantity,
      revenueCents: value.revenueCents,
    }))
    .sort(
      (a, b) =>
        b.revenueCents - a.revenueCents || a.productName.localeCompare(b.productName),
    )
    .slice(0, 10);

  const lifecycleBySource = {
    orderConfirmed: emptyLifecycleSourceBreakdown(),
    orderCompleted: emptyLifecycleSourceBreakdown(),
    orderCancelled: emptyLifecycleSourceBreakdown(),
  };
  let orderConfirmed = 0;
  let orderCompleted = 0;
  let orderCancelled = 0;

  for (const event of input.lifecycleEvents) {
    let bucket: LifecycleSourceBreakdown | null = null;
    if (event.name === "order_confirmed") {
      orderConfirmed += 1;
      bucket = lifecycleBySource.orderConfirmed;
    } else if (event.name === "order_completed") {
      orderCompleted += 1;
      bucket = lifecycleBySource.orderCompleted;
    } else if (event.name === "order_cancelled") {
      orderCancelled += 1;
      bucket = lifecycleBySource.orderCancelled;
    }
    if (!bucket) continue;
    if (event.source == null) {
      bucket.unclassified += 1;
    } else {
      bucket.bySource[event.source] += 1;
    }
  }

  const createdAtByOrderId = new Map<string, number>();
  for (const event of input.createdEventsForTiming) {
    if (!event.orderId) continue;
    const existing = createdAtByOrderId.get(event.orderId);
    const ts = event.occurredAt.getTime();
    if (existing == null || ts < existing) {
      createdAtByOrderId.set(event.orderId, ts);
    }
  }

  const toConfirmed: number[] = [];
  const toCompleted: number[] = [];
  for (const event of input.lifecycleEvents) {
    if (!event.orderId) continue;
    const createdTs = createdAtByOrderId.get(event.orderId);
    if (createdTs == null) continue;
    const delta = event.occurredAt.getTime() - createdTs;
    if (delta < 0) continue;
    if (event.name === "order_confirmed") {
      toConfirmed.push(delta);
    } else if (event.name === "order_completed") {
      toCompleted.push(delta);
    }
  }

  const funnelEventCounts = FUNNEL_EVENT_NAMES.map((name) => ({
    name,
    count: countByName(input.funnelCounts, name),
  }));

  const menuViewed = countByName(input.funnelCounts, "menu_viewed");
  const productAdded = countByName(input.funnelCounts, "product_added");
  const checkoutStarted = countByName(input.funnelCounts, "checkout_started");
  const orderCreatedDirect = input.orderCreatedDirectCount;
  const whatsappHandoffStarted = countByName(
    input.funnelCounts,
    "whatsapp_handoff_started",
  );

  return {
    store: input.store,
    period: input.period,
    funnelEventCounts,
    onlineFunnel: {
      menuViewed,
      productAdded,
      checkoutStarted,
      orderCreatedDirect,
      whatsappHandoffStarted,
      ratios: {
        productAddedPerMenuViewed: safeRatio(productAdded, menuViewed),
        checkoutStartedPerMenuViewed: safeRatio(checkoutStarted, menuViewed),
        orderCreatedDirectPerCheckoutStarted: safeRatio(
          orderCreatedDirect,
          checkoutStarted,
        ),
        whatsappHandoffPerOrderCreatedDirect: safeRatio(
          whatsappHandoffStarted,
          orderCreatedDirect,
        ),
      },
    },
    creationCohort: {
      total: input.cohortOrders.length,
      bySource,
      byStatus,
      open,
      completed,
      cancelled,
      revenueCompletedCents,
      completedOrderCount,
      ticketAverageCents:
        completedOrderCount > 0
          ? Math.round(revenueCompletedCents / completedOrderCount)
          : null,
    },
    lifecycleEventsOccurred: {
      orderConfirmed,
      orderCompleted,
      orderCancelled,
      bySource: lifecycleBySource,
    },
    timing: {
      createdToConfirmed: {
        sampleSize: toConfirmed.length,
        medianMs: medianMs(toConfirmed),
      },
      createdToCompleted: {
        sampleSize: toCompleted.length,
        medianMs: medianMs(toCompleted),
      },
    },
    topProducts: {
      operationalQuantity,
      completedRevenue,
    },
    notes: buildNotes(),
  };
}

export async function loadWeeklyFunnelReport(
  options: {
    storeSlug: string;
    period: WeeklyFunnelReportPeriod;
  },
  db: WeeklyFunnelReportDb | PrismaClient,
): Promise<WeeklyFunnelReport> {
  const store = await db.store.findUnique({
    where: { slug: options.storeSlug },
    select: { id: true, slug: true, name: true },
  });
  if (!store) {
    throw new Error(`Store not found for slug "${options.storeSlug}"`);
  }

  const { fromAt, toAt } = options.period;
  const occurredInWindow = {
    storeId: store.id,
    occurredAt: { gte: fromAt, lt: toAt },
  };

  const [funnelCounts, cohortOrders, lifecycleEvents, orderCreatedDirectCount] =
    await Promise.all([
      db.funnelEvent.groupBy({
        by: ["name"],
        where: occurredInWindow,
        _count: { _all: true },
      }),
      db.order.findMany({
        where: {
          storeId: store.id,
          createdAt: { gte: fromAt, lt: toAt },
        },
        select: {
          id: true,
          source: true,
          status: true,
          totalCents: true,
        },
      }),
      db.funnelEvent.findMany({
        where: {
          ...occurredInWindow,
          name: {
            in: ["order_confirmed", "order_completed", "order_cancelled"],
          },
        },
        select: {
          name: true,
          orderId: true,
          source: true,
          occurredAt: true,
        },
      }),
      db.funnelEvent.count({
        where: {
          storeId: store.id,
          name: "order_created",
          source: "DIRECT",
          occurredAt: { gte: fromAt, lt: toAt },
        },
      }),
    ]);

  const cohortOrderIds = cohortOrders.map((order) => order.id);
  const timingOrderIds = [
    ...new Set(
      (lifecycleEvents as LifecycleEventRow[])
        .map((event) => event.orderId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [cohortItems, createdEventsForTiming] = await Promise.all([
    cohortOrderIds.length === 0
      ? Promise.resolve([] as OrderItemRow[])
      : db.orderItem.findMany({
          where: { orderId: { in: cohortOrderIds } },
          select: {
            orderId: true,
            productNameSnapshot: true,
            quantity: true,
            totalCents: true,
          },
        }),
    timingOrderIds.length === 0
      ? Promise.resolve([] as CreatedEventRow[])
      : db.funnelEvent.findMany({
          where: {
            storeId: store.id,
            name: "order_created",
            orderId: { in: timingOrderIds },
          },
          select: {
            orderId: true,
            occurredAt: true,
          },
        }),
  ]);

  return buildWeeklyFunnelReportFromData({
    store,
    period: options.period,
    funnelCounts: funnelCounts as FunnelCountRow[],
    orderCreatedDirectCount,
    cohortOrders: cohortOrders as OrderCohortRow[],
    cohortItems: cohortItems as OrderItemRow[],
    lifecycleEvents: lifecycleEvents as LifecycleEventRow[],
    createdEventsForTiming: createdEventsForTiming as CreatedEventRow[],
  });
}

export function formatMoneyCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDurationMs(ms: number | null): string {
  if (ms == null) {
    return "n/a";
  }
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function formatWeeklyFunnelReportText(report: WeeklyFunnelReport): string {
  const lines: string[] = [];
  const { period, store, creationCohort, onlineFunnel, lifecycleEventsOccurred } =
    report;

  lines.push("Weekly funnel report");
  lines.push(`store: ${store.name} (${store.slug} / ${store.id})`);
  lines.push(`timezone: ${period.timezone}`);
  lines.push(
    `window: ${period.fromDate} <= t < ${period.toDate} (SP calendar days)`,
  );
  lines.push(`utc: ${period.fromAt.toISOString()} <= t < ${period.toAt.toISOString()}`);
  lines.push("");

  lines.push("## Funnel events (occurredAt in window)");
  for (const row of report.funnelEventCounts) {
    lines.push(`- ${row.name}: ${row.count}`);
  }
  lines.push("");

  lines.push("## Online funnel (counts + volume ratios)");
  lines.push(`- menu_viewed: ${onlineFunnel.menuViewed}`);
  lines.push(`- product_added: ${onlineFunnel.productAdded}`);
  lines.push(`- checkout_started: ${onlineFunnel.checkoutStarted}`);
  lines.push(
    `- order_created (DIRECT): ${onlineFunnel.orderCreatedDirect}`,
  );
  lines.push(
    `- whatsapp_handoff_started: ${onlineFunnel.whatsappHandoffStarted}`,
  );
  lines.push(
    `- ratio product_added / menu_viewed: ${formatRatio(onlineFunnel.ratios.productAddedPerMenuViewed)}`,
  );
  lines.push(
    `- ratio checkout_started / menu_viewed: ${formatRatio(onlineFunnel.ratios.checkoutStartedPerMenuViewed)}`,
  );
  lines.push(
    `- ratio order_created DIRECT / checkout_started: ${formatRatio(onlineFunnel.ratios.orderCreatedDirectPerCheckoutStarted)}`,
  );
  lines.push(
    `- ratio whatsapp_handoff_started / order_created DIRECT: ${formatRatio(onlineFunnel.ratios.whatsappHandoffPerOrderCreatedDirect)}`,
  );
  lines.push(
    "- note: ratios are volume counts ÷ counts, not per-session conversion; denominator 0 → n/a",
  );
  lines.push("");

  lines.push("## Creation cohort (Order.createdAt in window)");
  lines.push(`- total: ${creationCohort.total}`);
  lines.push(`- by source: ${formatSourceCounts(creationCohort.bySource)}`);
  lines.push("- by current status:");
  for (const status of ORDER_STATUSES) {
    lines.push(`  - ${status}: ${creationCohort.byStatus[status]}`);
  }
  lines.push(
    `- groups: open=${creationCohort.open} completed=${creationCohort.completed} cancelled=${creationCohort.cancelled}`,
  );
  lines.push(
    `- revenue (creation cohort currently COMPLETED): ${formatMoneyCents(creationCohort.revenueCompletedCents)}`,
  );
  lines.push(
    `- completed orders (creation cohort): ${creationCohort.completedOrderCount}`,
  );
  lines.push(
    `- ticket average (revenue ÷ completed count): ${
      creationCohort.ticketAverageCents == null
        ? "n/a"
        : formatMoneyCents(creationCohort.ticketAverageCents)
    }`,
  );
  lines.push("");

  lines.push("## Lifecycle events occurred (FunnelEvent.occurredAt in window)");
  lines.push(
    `- order_confirmed: ${lifecycleEventsOccurred.orderConfirmed} (${formatLifecycleSourceBreakdown(lifecycleEventsOccurred.bySource.orderConfirmed)})`,
  );
  lines.push(
    `- order_completed: ${lifecycleEventsOccurred.orderCompleted} (${formatLifecycleSourceBreakdown(lifecycleEventsOccurred.bySource.orderCompleted)})`,
  );
  lines.push(
    `- order_cancelled: ${lifecycleEventsOccurred.orderCancelled} (${formatLifecycleSourceBreakdown(lifecycleEventsOccurred.bySource.orderCancelled)})`,
  );
  lines.push(
    "- note: null source is unclassified (never inferred as DIRECT)",
  );
  lines.push("");

  lines.push("## Timing (lifecycle events in window vs order_created)");
  lines.push(
    `- created→confirmed median: ${formatDurationMs(report.timing.createdToConfirmed.medianMs)} (n=${report.timing.createdToConfirmed.sampleSize})`,
  );
  lines.push(
    `- created→completed median: ${formatDurationMs(report.timing.createdToCompleted.medianMs)} (n=${report.timing.createdToCompleted.sampleSize})`,
  );
  lines.push("");

  lines.push("## Top products");
  lines.push("- operational quantity (creation cohort, status ≠ CANCELLED):");
  if (report.topProducts.operationalQuantity.length === 0) {
    lines.push("  (none)");
  } else {
    for (const row of report.topProducts.operationalQuantity) {
      lines.push(`  - ${row.productName}: qty=${row.quantity}`);
    }
  }
  lines.push("- completed revenue (creation cohort, status = COMPLETED only):");
  if (report.topProducts.completedRevenue.length === 0) {
    lines.push("  (none)");
  } else {
    for (const row of report.topProducts.completedRevenue) {
      lines.push(
        `  - ${row.productName}: qty=${row.quantity} revenue=${formatMoneyCents(row.revenueCents)}`,
      );
    }
  }
  lines.push("");

  lines.push("## Notes");
  for (const note of report.notes) {
    lines.push(`- ${note}`);
  }
  lines.push("");

  return lines.join("\n");
}
