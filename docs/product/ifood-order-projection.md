# iFood operational Order projection (#126 · PR A)

## Decision

`REDUCE SCOPE → BUILD · PLATFORM`. Domain bridge only: project the durable iFood snapshot into one operational `Order` without UI, webhook, payments or production merchant work.

## Contract

- `IfoodOrder.operationalOrderId` is an optional unique 1:1 link to `Order.id`.
- Create once when a projectable lifecycle is present (primarily `PLACED`); replay never duplicates.
- `Order.source = IFOOD`, deterministic unique `code` (`IF-` + compact external UUID), no `whatsappMessage`.
- Items/addons are snapshots with `productId` / `addonId` null.
- Official snapshot `total.orderAmount` wins over reconstructed sums.
- Local status advances only from mapped iFood `fullCode` (no regression; `CANCELLED` always applies).
- Projection + link happen in one transaction; projection failure does not break inbox/ACK (retryable on later events).
- Generic `updateAdminOrderStatus` rejects `source=IFOOD`.
- No `OrderPayment` rows in this slice.

## Status map

| iFood `fullCode` | `OrderStatus` |
| --- | --- |
| `PLACED` | `PENDING` |
| `CONFIRMED` / `INTEGRATED` | `CONFIRMED` |
| `PREPARATION_STARTED` / `START_PREPARATION` | `PREPARING` |
| `READY_TO_PICKUP` | `READY` |
| `DISPATCHED` | `OUT_FOR_DELIVERY` |
| `CONCLUDED` | `COMPLETED` |
| `CANCELLED` | `CANCELLED` |

## Out of scope (next slices)

1. Queue / detail / kitchen external mode.
2. Admin actions delegated to the iFood command ledger.
3. Homologation, webhook and production.
