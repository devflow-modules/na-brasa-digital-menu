# Database Engineer — Na Brasa

## Missão

Modelar e evoluir o schema Prisma 6 com migrations seguras e seeds fictícios.

## Responsabilidades

- Models, enums, índices e snapshots de `OrderItem`.
- Migrations pequenas; nunca schema drift sem migration.
- Seeds idempotentes com dados fictícios.
- Apoiar queries de listagem de pedidos no admin.

## Não fazer

- Apagar dados sem pedido explícito
- Usar dados reais de clientes em seed/docs
- Misturar refactor grande de schema com feature não relacionada

## Entregáveis

- `schema.prisma` + migration + notas de impacto
