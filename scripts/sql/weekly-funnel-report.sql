-- Weekly funnel report (#104) — Neon / Postgres SQL editor
-- Half-open window: from_at <= timestamp < to_at
-- Edit the params CTE, then run the statements below one block at a time.

WITH params AS (
  SELECT
    'REPLACE_WITH_STORE_ID'::text AS store_id,
    '2026-07-14T03:00:00Z'::timestamptz AS from_at,
    '2026-07-21T03:00:00Z'::timestamptz AS to_at
)

-- 1) Funnel events occurred in window
SELECT
  fe."name",
  COUNT(*)::int AS count
FROM "FunnelEvent" fe
CROSS JOIN params p
WHERE fe."storeId" = p.store_id
  AND fe."occurredAt" >= p.from_at
  AND fe."occurredAt" < p.to_at
GROUP BY fe."name"
ORDER BY fe."name";

WITH params AS (
  SELECT
    'REPLACE_WITH_STORE_ID'::text AS store_id,
    '2026-07-14T03:00:00Z'::timestamptz AS from_at,
    '2026-07-21T03:00:00Z'::timestamptz AS to_at
)

-- 2) Online order_created (DIRECT only)
SELECT COUNT(*)::int AS order_created_direct
FROM "FunnelEvent" fe
CROSS JOIN params p
WHERE fe."storeId" = p.store_id
  AND fe."name" = 'order_created'
  AND fe."source" = 'DIRECT'
  AND fe."occurredAt" >= p.from_at
  AND fe."occurredAt" < p.to_at;

WITH params AS (
  SELECT
    'REPLACE_WITH_STORE_ID'::text AS store_id,
    '2026-07-14T03:00:00Z'::timestamptz AS from_at,
    '2026-07-21T03:00:00Z'::timestamptz AS to_at
),
counts AS (
  SELECT
    COUNT(*) FILTER (WHERE fe."name" = 'menu_viewed')::int AS menu_viewed,
    COUNT(*) FILTER (WHERE fe."name" = 'product_added')::int AS product_added,
    COUNT(*) FILTER (WHERE fe."name" = 'checkout_started')::int AS checkout_started,
    COUNT(*) FILTER (
      WHERE fe."name" = 'order_created' AND fe."source" = 'DIRECT'
    )::int AS order_created_direct,
    COUNT(*) FILTER (WHERE fe."name" = 'whatsapp_handoff_started')::int
      AS whatsapp_handoff_started
  FROM "FunnelEvent" fe
  CROSS JOIN params p
  WHERE fe."storeId" = p.store_id
    AND fe."occurredAt" >= p.from_at
    AND fe."occurredAt" < p.to_at
)

-- 2b) Online volume ratios (counts ÷ counts; NULL when denominator is 0 — never 0%)
-- These are volume ratios, not per-session conversion.
SELECT
  c.menu_viewed,
  c.product_added,
  c.checkout_started,
  c.order_created_direct,
  c.whatsapp_handoff_started,
  CASE
    WHEN c.menu_viewed = 0 THEN NULL
    ELSE ROUND((c.product_added::numeric / c.menu_viewed) * 100, 1)
  END AS product_added_per_menu_viewed_pct,
  CASE
    WHEN c.menu_viewed = 0 THEN NULL
    ELSE ROUND((c.checkout_started::numeric / c.menu_viewed) * 100, 1)
  END AS checkout_started_per_menu_viewed_pct,
  CASE
    WHEN c.checkout_started = 0 THEN NULL
    ELSE ROUND((c.order_created_direct::numeric / c.checkout_started) * 100, 1)
  END AS order_created_direct_per_checkout_started_pct,
  CASE
    WHEN c.order_created_direct = 0 THEN NULL
    ELSE ROUND(
      (c.whatsapp_handoff_started::numeric / c.order_created_direct) * 100,
      1
    )
  END AS whatsapp_handoff_per_order_created_direct_pct
FROM counts c;

WITH params AS (
  SELECT
    'REPLACE_WITH_STORE_ID'::text AS store_id,
    '2026-07-14T03:00:00Z'::timestamptz AS from_at,
    '2026-07-21T03:00:00Z'::timestamptz AS to_at
)

-- 3) Creation cohort: orders created in window + current status (not transitions)
SELECT
  o."source",
  o."status",
  COUNT(*)::int AS order_count
FROM "Order" o
CROSS JOIN params p
WHERE o."storeId" = p.store_id
  AND o."createdAt" >= p.from_at
  AND o."createdAt" < p.to_at
GROUP BY o."source", o."status"
ORDER BY o."source", o."status";

WITH params AS (
  SELECT
    'REPLACE_WITH_STORE_ID'::text AS store_id,
    '2026-07-14T03:00:00Z'::timestamptz AS from_at,
    '2026-07-21T03:00:00Z'::timestamptz AS to_at
)

-- 4) Creation cohort revenue + ticket (currently COMPLETED only)
SELECT
  COUNT(*)::int AS completed_order_count,
  COALESCE(SUM(o."totalCents"), 0)::bigint AS revenue_completed_cents,
  CASE
    WHEN COUNT(*) = 0 THEN NULL
    ELSE ROUND(AVG(o."totalCents"))::bigint
  END AS ticket_average_cents
FROM "Order" o
CROSS JOIN params p
WHERE o."storeId" = p.store_id
  AND o."createdAt" >= p.from_at
  AND o."createdAt" < p.to_at
  AND o."status" = 'COMPLETED';

WITH params AS (
  SELECT
    'REPLACE_WITH_STORE_ID'::text AS store_id,
    '2026-07-14T03:00:00Z'::timestamptz AS from_at,
    '2026-07-21T03:00:00Z'::timestamptz AS to_at
)

-- 5) Lifecycle events occurred in window (not current Order.status)
-- null source is unclassified — never coerced to DIRECT
SELECT
  fe."name",
  COALESCE(fe."source"::text, 'unclassified') AS source_bucket,
  COUNT(*)::int AS count
FROM "FunnelEvent" fe
CROSS JOIN params p
WHERE fe."storeId" = p.store_id
  AND fe."name" IN ('order_confirmed', 'order_completed', 'order_cancelled')
  AND fe."occurredAt" >= p.from_at
  AND fe."occurredAt" < p.to_at
GROUP BY fe."name", COALESCE(fe."source"::text, 'unclassified')
ORDER BY fe."name", source_bucket;

WITH params AS (
  SELECT
    'REPLACE_WITH_STORE_ID'::text AS store_id,
    '2026-07-14T03:00:00Z'::timestamptz AS from_at,
    '2026-07-21T03:00:00Z'::timestamptz AS to_at
),
cohort AS (
  SELECT o."id", o."status"
  FROM "Order" o
  CROSS JOIN params p
  WHERE o."storeId" = p.store_id
    AND o."createdAt" >= p.from_at
    AND o."createdAt" < p.to_at
)

-- 6a) Top products — operational quantity (creation cohort, status <> CANCELLED)
SELECT
  oi."productNameSnapshot" AS product_name,
  SUM(oi."quantity")::int AS quantity
FROM "OrderItem" oi
JOIN cohort c ON c."id" = oi."orderId"
WHERE c."status" <> 'CANCELLED'
GROUP BY oi."productNameSnapshot"
ORDER BY quantity DESC, product_name ASC
LIMIT 10;

WITH params AS (
  SELECT
    'REPLACE_WITH_STORE_ID'::text AS store_id,
    '2026-07-14T03:00:00Z'::timestamptz AS from_at,
    '2026-07-21T03:00:00Z'::timestamptz AS to_at
),
cohort AS (
  SELECT o."id", o."status"
  FROM "Order" o
  CROSS JOIN params p
  WHERE o."storeId" = p.store_id
    AND o."createdAt" >= p.from_at
    AND o."createdAt" < p.to_at
)

-- 6b) Top products — completed revenue only (creation cohort COMPLETED)
SELECT
  oi."productNameSnapshot" AS product_name,
  SUM(oi."quantity")::int AS quantity,
  SUM(oi."totalCents")::bigint AS revenue_cents
FROM "OrderItem" oi
JOIN cohort c ON c."id" = oi."orderId"
WHERE c."status" = 'COMPLETED'
GROUP BY oi."productNameSnapshot"
ORDER BY revenue_cents DESC, product_name ASC
LIMIT 10;

WITH params AS (
  SELECT
    'REPLACE_WITH_STORE_ID'::text AS store_id,
    '2026-07-14T03:00:00Z'::timestamptz AS from_at,
    '2026-07-21T03:00:00Z'::timestamptz AS to_at
),
lifecycle AS (
  SELECT
    fe."orderId",
    fe."name",
    fe."occurredAt"
  FROM "FunnelEvent" fe
  CROSS JOIN params p
  WHERE fe."storeId" = p.store_id
    AND fe."name" IN ('order_confirmed', 'order_completed')
    AND fe."orderId" IS NOT NULL
    AND fe."occurredAt" >= p.from_at
    AND fe."occurredAt" < p.to_at
),
created AS (
  SELECT
    fe."orderId",
    MIN(fe."occurredAt") AS created_at
  FROM "FunnelEvent" fe
  CROSS JOIN params p
  WHERE fe."storeId" = p.store_id
    AND fe."name" = 'order_created'
    AND fe."orderId" IN (SELECT DISTINCT l."orderId" FROM lifecycle l)
  GROUP BY fe."orderId"
),
deltas AS (
  SELECT
    l."name",
    EXTRACT(EPOCH FROM (l."occurredAt" - c.created_at)) * 1000 AS delta_ms
  FROM lifecycle l
  JOIN created c ON c."orderId" = l."orderId"
  WHERE l."occurredAt" >= c.created_at
)

-- 7) Median timing: lifecycle in window; order_created may be before window
SELECT
  'created_to_confirmed'::text AS metric,
  COUNT(*)::int AS sample_size,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY d.delta_ms) AS median_ms
FROM deltas d
WHERE d."name" = 'order_confirmed'
UNION ALL
SELECT
  'created_to_completed'::text AS metric,
  COUNT(*)::int AS sample_size,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY d.delta_ms) AS median_ms
FROM deltas d
WHERE d."name" = 'order_completed';
