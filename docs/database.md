# Database — Na Brasa Digital Menu

Modelo de dados (Prisma 6 + PostgreSQL) para o cardápio online e fundação multi-admin.

Decisão de produto/plataforma: [ADR 0002 — Database-backed multi-admin and master panel](adr/0002-database-backed-multi-admin-and-master-panel.md).

## Decisões

| Decisão | Motivo |
| --- | --- |
| `Store` desde a V1 | Isola dados da loja (`slug`) sem marketplace público agora |
| Dinheiro em centavos (`*Cents` / `Int`) | Evita `Decimal` e floating point no cardápio simples |
| Snapshots em `OrderItem` / `OrderItemAddon` | Pedido histórico não muda se o cardápio mudar |
| `OrderSource` | Diferencia pedido direto, iFood (futuro) e outros |
| Totais em `Order` | `subtotalCents`, `deliveryFeeCents`, `totalCents` recalculados no server na criação |
| `User` + `UserRole` no banco | Auth multi-cliente; `/admin` por loja e `/master` para operação da plataforma (ADR 0002) |

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

- **Store** — loja (Na Braza é o 1º tenant; slug técnico `na-brasa`), WhatsApp, taxas e flags de retirada/entrega
- **Category** — categorias do cardápio (`sortOrder`, `active`)
- **Addon** — adicionais (`priceCents`, `active`, `sortOrder`)
- **Product** — itens (`priceCents`, `featured`, `sortOrder`, `active`, `available`)
- **ProductAddon** — vínculo N:N produto ↔ adicional

### Usuários (fundação — ADR 0002)

- **User** — `name`, `email` (unique), `passwordHash`, `role`, `isActive`, `storeId?`
- **UserRole** — `MASTER` | `STORE_OWNER` | `MANAGER` | `OPERATOR` | `KITCHEN`

Regras de produto (documentadas; constraints complexas role↔storeId **ainda não** no banco):

| Role | `storeId` |
| --- | --- |
| `MASTER` | Pode ser `null` (DevFlow Labs / operação da plataforma) |
| `STORE_OWNER`, `MANAGER`, `OPERATOR`, `KITCHEN` | Devem estar vinculados a uma `Store` (obrigatório no `/admin`) |

Índices: `storeId`, `role`, `isActive`. Relação `Store.users` ↔ `User.store` (`onDelete: Restrict`).

Login **runtime** de `/admin` autentica `User` no banco (`passwordHash` + `bcryptjs`). Session JWT inclui `userId`, `name`, `email`, `role`, `storeId`.

`MASTER` pode usar `/admin` **transicionalmente** (Store de `NEXT_PUBLIC_STORE_SLUG`). Gestão de usuários por loja: `/master/stores/[storeId]/users`. CRUD de lojas no `/master` = roadmap.

`ADMIN_EMAIL` / `ADMIN_PASSWORD` **não** são mais fonte de autenticação.

### Pedidos

- **Order** — cliente, entrega, pagamento, totais, `status`, `source`, mensagem WhatsApp opcional
- **OrderItem** — quantidade + **snapshots** do produto + `totalCents`
- **OrderItemAddon** — **snapshots** do adicional no item

`productId` / `addonId` nos itens são opcionais (`onDelete: SetNull`) para preservar o histórico se o catálogo for removido.

## Enums

- `OrderStatus`: PENDING → … → COMPLETED / CANCELLED
- `DeliveryType`: PICKUP, DELIVERY
- `PaymentMethod`: CASH, PIX, CARD (sem gateway na V1)
- `OrderSource`: DIRECT, IFOOD, OTHER
- `UserRole`: MASTER, STORE_OWNER, MANAGER, OPERATOR, KITCHEN

## Seed

```bash
pnpm prisma:seed
```

Seed **bootstrap técnico** idempotente e **seguro para produção** em `prisma/seed.ts`:

- Store `na-brasa`: **cria só se não existir**. Se já existir, **não** sobrescreve WhatsApp, endereço, horários, taxas, pedido mínimo, flags (`isOpen`, retirada/entrega) nem outros campos operacionais.
- Categorias / produtos / adicionais: **cria somente os que faltam** (por nome na loja). Linhas existentes **não** são regravadas (preços, descrições, vínculos `ProductAddon` reais permanecem).
- WhatsApp placeholder `5513999999999` só na **primeira** criação da Store — não substitui WhatsApp real em re-seeds.
- Não cria pedidos reais.
- O summary do seed **não** imprime o número de WhatsApp (só flag `whatsappIsPlaceholder`).
- **MASTER opcional:** se `MASTER_ADMIN_NAME`, `MASTER_ADMIN_EMAIL` e `MASTER_ADMIN_PASSWORD` estiverem definidos, faz upsert do usuário `MASTER` (`storeId` null, hash via `bcryptjs`). Se faltar alguma env, avisa e segue o seed do cardápio. **Não** usa `ADMIN_EMAIL` / `ADMIN_PASSWORD` nem senha padrão hardcoded.

Não use o seed para “sincronizar” cardápio oficial em produção; dados reais devem ser editados em `/admin/cardapio` e `/admin/configuracoes`, não reescritos por placeholders.

## Migration

```bash
pnpm prisma migrate dev --name add_database_backed_users_roles
```

(Histórico inicial do catálogo: `init_menu_order_models`.)

## Fora desta modelagem (ainda)

UI de `/master`, CRUD de usuários, login via banco, store-scoping de `/admin`, iFood API, pagamento online.
