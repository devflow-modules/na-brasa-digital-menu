# ADR 0002 — Database-backed multi-admin and master panel

> **Nota de contexto — 2026:** Na Braza é o **cliente 1** e primeira implantação real (`na-brasa`). A plataforma ainda não possui nome comercial definitivo; em documentação interna do Cursor usa-se provisoriamente **Digital Menu Platform**. Referências a *Na Brasa Digital Menu*, **DevFlow Menu** ou **DevFlow Labs** neste ADR refletem o **contexto histórico** da decisão — o corpo abaixo permanece o registro aceito.

- **Status:** Accepted
- **Date:** 2026-07-14
- **Product:** Na Brasa Digital Menu → white-label platform (DevFlow Labs)

## Context

The project started as a single-store technical MVP for **Na Braza**, with:

- Public menu at `/na-brasa`
- Cart → checkout → order persistence → WhatsApp redirect (`wa.me`)
- Store operator panel at `/admin`
- Admin authentication via environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`) and an HttpOnly session cookie (`ADMIN_SESSION_COOKIE`)

Production is live at:

https://na-brasa-cardapio.vercel.app

Product direction has changed:

- **Na Braza** becomes the first real client/tenant, not the permanent product identity.
- The system evolves into a **white-label online menu platform**.
- `/admin` is the **store/client** operational panel.
- `/master` is the **DevFlow Labs** operational panel (platform operator).
- Users and permissions must move **out of runtime env auth** and into the **database**.

The current env-based single admin cannot support multiple store users, operational roles, platform support, or future monetization.

## Decision

Adopt **database-persisted users** with explicit roles, store scoping, and a dedicated master panel.

### Roles

| Role | Meaning | Store binding |
| --- | --- | --- |
| `MASTER` | DevFlow Labs / platform operator | Not required |
| `STORE_OWNER` | Store owner | Required |
| `MANAGER` | Store manager | Required |
| `OPERATOR` | Store operator (orders/day-to-day) | Required |
| `KITCHEN` | Kitchen/back-of-house | Required |

### Access boundaries

- `MASTER` may access `/master` only among these roles for platform operations.
- `/admin` is for **store users** bound to their own `Store`.
- Orders and operational data remain **scoped by `storeId`**.
- Isolation by `storeId` is a hard requirement for multi-tenant safety.

### Auth migration

- Migrate gradually from env login to **database-backed login**.
- Keep as **technical session secrets** (not identity source):
  - `ADMIN_JWT_SECRET`
  - `ADMIN_SESSION_COOKIE`
- After migration, stop using as **runtime authentication source**:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`

### Bootstrap of platform admin

Seed/bootstrap must create the initial `MASTER` user safely from dedicated envs (no hardcoded default password, no committed secrets):

- `MASTER_ADMIN_NAME`
- `MASTER_ADMIN_EMAIL`
- `MASTER_ADMIN_PASSWORD`

### Incremental delivery (small PRs)

| PR | Scope |
| --- | --- |
| **#16** | `User` / `UserRole` foundation in the database + master seed |
| **#17** | Login via database |
| **#18** | `/master` foundation |
| **#19** | Store-scoped `/admin` |
| **#20** | Manage store users |

This ADR does **not** implement functional code, Prisma schema changes, or auth changes — it only records the decision and rollout sequence.

## Alternatives considered

### 1. Keep single admin via env

- **Pros:** Already shipped; simplest ops for a throwaway MVP.
- **Cons:** Does not scale to a real client staff, multiple stores, platform support, or white-label.

### 2. One admin user per store, no roles

- **Pros:** Better than env; one credential per tenant in the database.
- **Cons:** Blocks kitchen/operator split, owner vs staff, and DevFlow Labs platform operations; weak foundation for monetization.

### 3. Multi-admin with roles + master panel (chosen)

- **Pros:** Correct base for a real product: store isolation, role-based access, platform vs store separation, path to white-label/monetization.
- **Cons:** More work; must be shipped incrementally to avoid a large risky rewrite.

## Consequences

### Positive

- Multiple clients/stores become first-class.
- Clear separation: **platform ops** (`/master`) vs **store ops** (`/admin`).
- Multi-user store teams with roles.
- Safer bootstrap via dedicated master envs.
- Foundation for future white-label packaging and monetization.

### Negative / risks

- Auth and authorization become more complex than env comparison.
- Every store-facing query/mutation must enforce `storeId` isolation (authorization bugs become data leaks).
- Temporary dual model during migration (env → DB) needs careful cutover.
- Master seed secrets must stay out of git and out of logs.
- Existing production Na Braza admin flow must keep working during the incremental PRs.

### Out of scope for this ADR

- Prisma schema / migrations (follow in PR #16+)
- Changing current production auth behavior before the planned PRs
- WhatsApp Business API, online payments, iFood integration, native apps

## Related

- Current production: https://na-brasa-cardapio.vercel.app
- Existing env auth model documented in deployment / production checklist docs
- Follow-up implementation: PRs #16–#20 as listed above
