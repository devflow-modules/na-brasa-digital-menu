# Database — plataforma multi-tenant

Modelo de dados (Prisma 6 + PostgreSQL) para cardápio online, pedidos com snapshots e fundação **multi-admin / multi-tenant**. O tenant piloto em produção é **Na Braza** (`slug` `na-brasa`).

Decisão de produto/plataforma: [ADR 0002 — Database-backed multi-admin and master panel](adr/0002-database-backed-multi-admin-and-master-panel.md).

## Decisões

| Decisão | Motivo |
| --- | --- |
| `Store` desde a V1 | Isola dados da loja (`slug`) |
| Dinheiro em centavos (`*Cents` / `Int`) | Evita `Decimal` e floating point no cardápio simples |
| Snapshots em `OrderItem` / `OrderItemAddon` | Pedido histórico não muda se o cardápio mudar |
| `OrderSource` | Diferencia pedido direto, iFood (futuro) e outros |
| Totais em `Order` | Recalculados no server na criação |
| `User` + `UserRole` no banco | Auth multi-tenant; `/admin` por loja; `/master` para plataforma |

## Entidades

```text
Store
  ├── Category
  ├── Product ──< ProductAddon >── Addon
  ├── User (store-bound roles; MASTER may have storeId null)
  └── Order
        └── OrderItem
              └── OrderItemAddon
```

### Catálogo

- **Store** — tenant (Na Braza = 1º cliente; slug técnico `na-brasa`); WhatsApp, taxas, flags
- **Category** / **Product** / **Addon** / **ProductAddon** — cardápio por loja

### Usuários

- **User** — `email` (unique), `passwordHash`, `role`, `isActive`, `storeId?`
- **UserRole** — `MASTER` | `STORE_OWNER` | `MANAGER` | `OPERATOR` | `KITCHEN`

| Role | `storeId` |
| --- | --- |
| `MASTER` | Pode ser `null` (operador de plataforma) |
| Demais roles de loja | Obrigatório para `/admin` |

Login **runtime** em `/admin/login` usa `User` + bcrypt. Sessão JWT inclui `userId`, `role`, `storeId`.

`MASTER` pode usar `/admin` **transicionalmente** (Store de `NEXT_PUBLIC_STORE_SLUG`). Gestão de usuários por loja: `/master/stores/[storeId]/users`.

`ADMIN_EMAIL` / `ADMIN_PASSWORD` **não** são autenticação ativa.

### Pedidos

- **Order** — cliente, entrega, pagamento, totais, `status`, `source`, `whatsappMessage`
- **OrderItem** / **OrderItemAddon** — snapshots; FKs opcionais com `onDelete: SetNull`

## Enums

`OrderStatus`, `DeliveryType`, `PaymentMethod`, `OrderSource`, `UserRole` — ver `prisma/schema.prisma`.

## Seed

```bash
pnpm prisma:seed
```

Bootstrap idempotente em `prisma/seed.ts`:

- Store `na-brasa`: cria só se não existir; não sobrescreve ops em re-seed
- Catálogo: cria ausentes; não regrava linhas existentes
- `MASTER` opcional via `MASTER_ADMIN_*`

Não usar seed para “sincronizar” cardápio oficial em produção.

## Migration

```bash
pnpm prisma migrate dev
```

Histórico: migrations em `prisma/migrations/`.

## Estado atual

**Implementado:**

- Autenticação via `User` (DB-backed)
- Usuários por `Store` e painel `/master`
- Gestão de usuários por loja (`/master/stores/[storeId]/users`)
- Contexto administrativo por loja em `/admin` (`requireAdminStoreContext`)
- Isolamento por `storeId` em pedidos e operações admin tenant-scoped
- Snapshots históricos em itens de pedido

**Ainda não implementado (modelagem ou produto):**

- CRUD completo de `Store` pela UI master
- Onboarding self-service de novos tenants
- Storefront público dinâmico por slug (piloto usa rota `/na-brasa`)
- Billing, planos e limites por tenant
