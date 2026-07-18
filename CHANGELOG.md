# Changelog

All notable changes to this project are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions where practical.

## [Unreleased]

### Added

- Admin order queue live refresh: coordinated `router.refresh()` from existing notification polling (new DIRECT), tab visibility, successful status updates, and COUNTER create — without a second list poll, WebSocket, or SSE
- Admin order queue filters: status, source, and code/customer-name search via URL `searchParams` and server-side Prisma `where` (before `take: 50`); live refresh reused; no phone search or pagination
- Admin order queue elapsed time since creation (`formatOrderElapsedTime`) next to the absolute timestamp; server-rendered; updates via existing live refresh; no urgency threshold, SLA, or client timer

### Changed

- Documentation aligned with the client-validated, production-active pilot stage.
- Checkout / `createOrder`: minimum order amount applies only to `DELIVERY` (compared to product+addon subtotal before delivery fee). `PICKUP` and `COUNTER` have no minimum. Public copy says “pedido mínimo para entrega”.

### Status

```text
Pilot accepted by the client
Production operation active
Online and Counter order flows operational
Admin notifications and coordinated live refresh complete
Order queue filters and search complete
Order elapsed time visible in the admin queue
Absolute order timestamp preserved
Server-rendered elapsed labels
Existing live refresh reused
No urgency threshold or SLA introduced
No client timer or additional polling
Post-validation operational backlog in progress
Continuous feature validation remains required
Admin order queue live refresh complete
Existing notification polling reused
No duplicate queue polling introduced
Visibility, status and COUNTER refresh coordinated
No WebSocket or SSE
Admin order queue filters complete
Status and source filtering implemented
Code and customer-name search implemented
URL state preserved
Existing live refresh reused
No duplicate polling introduced
Phone search not implemented
Pagination not implemented
```

## [v0.1.0-pilot] — 2026-07-14

Pilot-ready release for Na Brasa validation. Documentation and operational gate; see [docs/releases/v0.1.0-pilot.md](docs/releases/v0.1.0-pilot.md).

### Added

- Public menu, cart, and checkout with WhatsApp handoff (`wa.me`)
- Order persistence with server-side total recalculation
- Admin auth (database `User`, bcrypt, JWT in HttpOnly cookie)
- Store-scoped `/admin` orders dashboard and order detail
- Role-based permissions for orders, menu, addons, and Store settings
- Order status workflow (PICKUP / DELIVERY paths)
- `/admin/cardapio` — categories, products, `active` / `available`
- `/admin/cardapio/adicionais` — addons and product links
- `/admin/configuracoes` — Store operational settings
- `/master` — platform overview and per-Store user management
- Playwright E2E suite and GitHub Actions (quality + E2E)
- Production and client acceptance checklists

### Security / safety

- HttpOnly session cookie (no admin token in `localStorage`)
- Server-side validation for orders, catalog, addons, and Store settings
- Store scoping on `/admin` (no cross-Store access)
- Role-based authorization on mutations
- Client does not trust prices or order totals
- Production-safe, idempotent seed (no destructive overwrite of existing Store data)

### Known limitations

- No online payment
- No WhatsApp Business / Cloud API
- No realtime notifications or polling
- No password reset UI
- No delivery zones
- No image upload in admin
- No Store CRUD in `/master`

[Unreleased]: https://github.com/devflow-modules/na-brasa-digital-menu/compare/v0.1.0-pilot...main
