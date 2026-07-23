# iFood test order actions (#122)

## Decision

`BUILD · PLATFORM`, test app only. This slice advances the external iFood lifecycle via the command ledger. Operational `Order` projection is a separate bridge (#126); see [ifood-order-projection.md](./ifood-order-projection.md). Admin detail actions (#131) are a thin tenant/RBAC adapter over the same ledger — see [ifood-admin-order-actions.md](./ifood-admin-order-actions.md).

## Contract

- HTTP `202` records a command as `ACCEPTED`; it does not confirm lifecycle.
- Only `CONFIRMED`, `PREPARATION_STARTED`/`START_PREPARATION`, `READY_TO_PICKUP`, or `DISPATCHED` inbox events correlate and confirm a command.
- After `ACCEPTED`, catch-up (#124) looks for a confirming inbox event already persisted for the same order/command and correlates idempotently without re-calling the API. Age barrier uses local clocks only: `IfoodEvent.receivedAt >= command.createdAt`. External `createdAt` remains for lifecycle ordering / `confirmedAt`, never for cross-system skew. If none exists, the command stays `ACCEPTED` for the poller.
- One logical command exists per external order and command type. Replays return it without another API request.
- A failed attempt may retry the same logical command and adds an append-only attempt row.
- Any `CANCELLED` event blocks every later action.
- Terminal action follows the official Order contract: DELIVERY uses `dispatch`; TAKEOUT/DINE_IN use `readyToPickup`. Missing/unknown `orderType` blocks the action.
- `SCHEDULED` preparation/terminal timing is outside this immediate test slice and is blocked.
- Attempts store status and HTTP code only. Upstream bodies, credentials and customer data are never persisted.

## Manual test-app flow

Keep the #120 poller running so each accepted action can be confirmed by its later event.

```bash
pnpm ifood:order-action -- --order-id <uuid> --action confirm
# wait for CONFIRMED in the inbox
pnpm ifood:order-action -- --order-id <uuid> --action start-preparation
# wait for PREPARATION_STARTED / START_PREPARATION
pnpm ifood:order-action -- --order-id <uuid> --action terminal
# wait for READY_TO_PICKUP or DISPATCHED
```

Run the same command again to prove replay does not create another attempt or API call.

## Out of scope

Admin UI for iFood actions, webhook, production merchant authorization, catalog, finance and shipping. Operational projection itself is covered by #126.
