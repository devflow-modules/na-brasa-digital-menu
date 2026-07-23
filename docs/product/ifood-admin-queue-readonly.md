# iFood admin queue/detail read-only (#129)

## Decision

`REDUCE SCOPE → BUILD · PLATFORM`. Make projected `Order(source=IFOOD)` visible and operationally clear in the existing admin queue/detail (including `KITCHEN`), without local status or receive actions.

## Contract

- Queue and source filter already include `IFOOD`; copy mentions online, counter and iFood.
- Payment label for iFood: **Pago/gerenciado pelo iFood** (never “Pagamento pendente”; no invented tender).
- Detail shows projected customer, modality, address, notes, item/addon snapshots and totals.
- Status note: **Status controlado pelo iFood; atualização automática pelos eventos.**
- No generic status buttons and no counter finalize for `IFOOD` (any role).
- Server `updateAdminOrderStatus` remains the depth-defense guard.
- DIRECT/COUNTER labels, actions and payment flows unchanged.

## Out of scope

Panel actions that call the iFood command ledger, kitchen route split, iFood sound alerts, finance/OrderPayment, webhook, production merchant.
