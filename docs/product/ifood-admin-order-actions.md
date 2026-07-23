# iFood admin detail actions (#131)

## Decision

`REDUCE SCOPE → BUILD · PLATFORM`. One next-action button on the admin order detail for `source=IFOOD`, delegated exclusively to `executeIfoodOrderCommand`.

## Contract

- Browser sends only the internal `Order.id`.
- Server resolves tenant, `IfoodOrder`, merchant, command and RBAC.
- HTTP `202` / command `ACCEPTED` means awaiting confirmation — `Order.status` changes only after projected inbox events.
- Replay / reload does not create another attempt when the logical command is already `PENDING`/`ACCEPTED`/`CONFIRMED`.
- `KITCHEN` may run prepare / ready-to-pickup; confirm and dispatch stay for roles with those permissions.
- DIRECT/COUNTER keep the generic status UI and services.

## Out of scope

Requested cancellation, batch actions, webhook, production merchant, finance.
