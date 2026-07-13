# Database — Na Brasa

Modelo inicial de dados (Prisma 6 + PostgreSQL) para o cardápio online.

## Decisões

| Decisão | Motivo |
| --- | --- |
| `Store` desde a V1 | Isola dados da loja (`slug`) sem marketplace público agora |
| Dinheiro em centavos (`*Cents` / `Int`) | Evita `Decimal` e floating point no cardápio simples |
| Snapshots em `OrderItem` / `OrderItemAddon` | Pedido histórico não muda se o cardápio mudar |
| `OrderSource` | Diferencia pedido direto, iFood (futuro) e outros |
| Totais em `Order` | `subtotalCents`, `deliveryFeeCents`, `totalCents` recalculados no server nas próximas PRs |

## Entidades

```text
Store
  ├── Category
  ├── Product ──< ProductAddon >── Addon
  └── Order
        └── OrderItem
              └── OrderItemAddon
```

### Catálogo

- **Store** — loja (Na Brasa), WhatsApp, taxas e flags de retirada/entrega
- **Category** — categorias do cardápio (`sortOrder`, `active`)
- **Product** — itens (`priceCents`, `featured`, `sortOrder`, `active`)
- **Addon** — adicionais da loja
- **ProductAddon** — vínculo N:N produto ↔ adicional

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

## Seed

```bash
pnpm prisma:seed
```

Seed idempotente em `prisma/seed.ts`:

- Store `na-brasa`
- Categorias, produtos e adicionais fictícios
- WhatsApp placeholder: `5513999999999`
- Não cria pedidos reais

## Migration

```bash
pnpm prisma migrate dev --name init_menu_order_models
```

## Fora desta modelagem

UI pública, carrinho, checkout, WhatsApp link, admin, auth, iFood API, pagamento online.
