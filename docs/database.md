# Database — plataforma multi-tenant

Modelo de dados (Prisma 6 + PostgreSQL) para cardápio online, pedidos com snapshots e fundação **multi-admin / multi-tenant**. O tenant piloto em produção é **Na Braza** (`slug` `na-brasa`).

Decisão de produto/plataforma: [ADR 0002 — Database-backed multi-admin and master panel](adr/0002-database-backed-multi-admin-and-master-panel.md).

## Decisões

| Decisão | Motivo |
| --- | --- |
| `Store` desde a V1 | Isola dados da loja (`slug`) |
| Dinheiro em centavos (`*Cents` / `Int`) | Evita `Decimal` e floating point no cardápio simples |
| Snapshots em `OrderItem` / `OrderItemAddon` | Pedido histórico não muda se o cardápio mudar |
| `OrderSource` | Diferencia `DIRECT`, `COUNTER` (balcão), iFood (futuro) e outros |
| Totais em `Order` | Recalculados no server na criação |
| `User` + `UserRole` no banco | Auth multi-tenant; `/admin` por loja; `/master` para plataforma |
| Telefone / pagamento opcionais no domínio | Comanda `COUNTER` abre sem telefone e sem pagamento; `DIRECT` continua exigindo ambos no create público |
| `createdByUserId` / `paidAt` | Operador que abriu a comanda; confirmação de pagamento no fechamento posterior (ainda não entregue) |

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
- **`OrderSource.COUNTER`** — comanda digital de balcão; criação autenticada, UI `/admin/balcao` e recebimento/finalização no detalhe entregues (não é PDV completo)
- **`customerPhone` / `paymentMethod`** — opcionais no modelo persistido compartilhado; o checkout público `DIRECT` continua exigindo ambos; COUNTER preenche `paymentMethod` só no recebimento
- **`createdByUserId`** — operador que abriu a comanda (`onDelete: SetNull`); preenchido pelo service autenticado de criação; nunca do payload livre do client
- **`paidAt`** — preenchido no servidor ao confirmar recebimento COUNTER (`finalizeCounterOrder`); pedidos existentes / DIRECT sem esse fluxo permanecem `null` (não reinterpretar `DIRECT` como “não pago” só por isso)
- **`changeForCents`** — espelho legado: valor **entregue** pelo cliente em `CASH` no finalize single-tender (pagamento exato = `null`); troco de apresentação legado = `changeForCents - totalCents`. Em pagamento misto fica `null` (ver `OrderPayment`)
- **`OrderPayment`** — parcelas de recebimento (Balcão); uma linha por `method` por pedido (`@@unique([orderId, method])`); FK composta `(orderId, storeId)` → `Order`; `amountCents` = valor aplicado ao total; `tenderedCents`/`changeCents` só em `CASH` (`changeCents` calculado no servidor). Sem `provider`/InfiniteTap nesta fatia
- **`PaymentMethod`** — novos pedidos usam `CASH` / `PIX` / `DEBIT_CARD` / `CREDIT_CARD`; `CARD` permanece no enum só para histórico sem tipo de cartão documentado (não disponível na UI de criação)
- **iFood inbox (test app, #120)** — `IfoodConnection` (`Store` ↔ `merchantId`; `isActive=false` para o poller), `IfoodEvent` append-only (`@@unique([connectionId, externalEventId])`), `IfoodOrder` snapshot por `externalOrderId` com lifecycle por `lastEventAt` + desempate `lastExternalEventId`. Credenciais só em env. **Não** cria/altera `Order` operacional nesta fatia.

Regra multi-tenant futura (service, não schema): `storeId` e `createdByUserId` vêm do contexto autenticado; o service valida vínculo do usuário com a Store; o catálogo resolve pelo mesmo `storeId`.

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
- Soft-auth `getAdminStoreContextOrNull` para actions que não podem redirect (ex.: poll)
- Consulta incremental de novos pedidos `DIRECT` após cursor `(createdAt, id)` + `pendingCount`
- UI admin: polling visibility-aware (8s), banner, badge PENDING live, som opcional local (`public/sounds/new-order.wav`)
- Isolamento por `storeId` em pedidos e operações admin tenant-scoped
- Snapshots históricos em itens de pedido

**Ainda não implementado (modelagem ou produto):**

- CRUD completo de `Store` pela UI master
- Onboarding self-service de novos tenants
- Storefront público dinâmico por slug (piloto usa rota `/na-brasa`)
- Billing, planos e limites por tenant
- Caixa, conciliação financeira e confirmação eletrônica de Pix/cartão
