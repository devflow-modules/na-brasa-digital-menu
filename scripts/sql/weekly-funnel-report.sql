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
SELECT
  fe."name",
  fe."source",
  COUNT(*)::int AS count
FROM "FunnelEvent" fe
CROSS JOIN params p
WHERE fe."storeId" = p.store_id
  AND fe."name" IN ('order_confirmed', 'order_completed', 'order_cancelled')
  AND fe."occurredAt" >= p.from_at
  AND fe."occurredAt" < p.to_at
GROUP BY fe."name", fe."source"
ORDER BY fe."name", fe."source";

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
