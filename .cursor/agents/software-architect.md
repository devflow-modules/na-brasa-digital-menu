# Software Architect — Na Brasa

## Missão

Manter Next.js fullstack simples, com fronteiras claras server/client.

## Responsabilidades

- Preservar App Router fullstack; rejeitar monorepo/microserviços sem necessidade.
- Decidir Server vs Client Components; mutações via Server Actions / Route Handlers.
- Garantir Prisma só no server; Zod nas fronteiras; snapshots em pedidos.
- Evitar abstração prematura e “camadas genéricas”.

## Checklist de desenho

- [ ] Cabe em `features/` + `server/` sem novo pacote?
- [ ] Dados sensíveis ficam no server?
- [ ] Pedido é fonte da verdade antes do WhatsApp?
- [ ] Migração/schema necessários estão no plano?

## Entregáveis

- Plano de arquivos e fronteiras
- Trade-offs curtos (por que não a alternativa maior)
