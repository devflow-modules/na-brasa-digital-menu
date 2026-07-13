# Release notes — MVP v0.1.0

**Na Brasa Digital Menu** — primeira versão operacional do cardápio online + painel admin.

Documentos: [README](../../README.md) · [Deploy](../deployment.md) · [Operação](../operations.md) · [Produto](../product.md)

## Features entregues

- Cardápio público mobile-first (`/na-brasa`) com categorias, produtos e adicionais ativos
- Carrinho local (estado + `localStorage`)
- Checkout com validação (Zod + React Hook Form)
- Criação real de pedido no PostgreSQL (totais recalculados no server; snapshots de itens)
- Abertura do WhatsApp via `wa.me` com mensagem formatada (sem WhatsApp Cloud API)
- Auth admin: JWT (`jose`) em cookie **HttpOnly**, `SameSite=Lax`, `Secure` em produção
- Dashboard de pedidos (`/admin`) com listagem e resumos
- Detalhe do pedido (`/admin/pedidos/[id]`)
- Gestão de status com transições validadas no server

## Fluxo público

1. Cliente acessa `/na-brasa`
2. Adiciona produtos/adicionais ao carrinho
3. Preenche `/na-brasa/checkout`
4. Pedido é salvo no banco (`PENDING`)
5. WhatsApp abre com a mensagem pronta

## Fluxo admin

1. Login em `/admin/login`
2. Lista pedidos em `/admin`
3. Abre detalhe em `/admin/pedidos/[id]`
4. Atualiza status com ações controladas

### Status suportados

`PENDING` · `CONFIRMED` · `PREPARING` · `READY` · `OUT_FOR_DELIVERY` · `COMPLETED` · `CANCELLED`

## Segurança

- Sessão admin em cookie HttpOnly (token **não** fica em `localStorage`)
- Credenciais admin via env (`ADMIN_EMAIL`, `ADMIN_PASSWORD`); JWT com `ADMIN_JWT_SECRET`
- Validação e autorização de mutações no server (Server Actions)
- Prisma isolado em repositories; sem API pública REST para pedidos/admin
- Pedidos contêm PII — painel deve permanecer protegido
- `.env` fora do git; use `.env.example` sem segredos reais

## Limitações conhecidas

- Sem CRUD de cardápio
- Sem upload de imagens
- Sem notificações em tempo real
- Sem WhatsApp Cloud API
- Sem pagamento online
- Sem múltiplos admins
- Sem histórico/auditoria de status
- Sem motivo de cancelamento

## Stack desta release

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma 6 · PostgreSQL · Zod · React Hook Form · jose · pnpm

## Próximas etapas recomendadas

1. Deploy em Vercel + Postgres gerenciado ([deployment.md](../deployment.md))
2. Configurar WhatsApp e cardápio com dados reais da loja
3. Validação operacional com o cliente ([operations.md](../operations.md))
4. Priorizar CRUD de cardápio / polish mobile / PWA conforme feedback
