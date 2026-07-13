# Release notes — MVP v0.1.0

**Status:** Production Validation Candidate (Release Candidate operacional)

**Na Brasa Digital Menu** — primeira versão operacional do cardápio online + painel admin, pronta para **deploy controlado** e validação com o dono antes de divulgação ampla.

Documentos: [README](../../README.md) · [Deploy](../deployment.md) · [Production checklist](../production-checklist.md) · [Operação](../operations.md) · [Testes / CI](../testing.md) · [Produto](../product.md)

## Features entregues

- Cardápio público mobile-first (`/na-brasa`) com categorias, produtos e adicionais ativos
- Carrinho local (estado + `localStorage`)
- Checkout com validação (Zod + React Hook Form)
- Criação real de pedido no PostgreSQL (totais recalculados no server; snapshots de itens)
- Abertura do WhatsApp via `wa.me` com mensagem formatada (sem WhatsApp Cloud API)

## Admin

- Auth: JWT (`jose`) em cookie **HttpOnly**, `SameSite=Lax`, `Secure` em produção
- Dashboard de pedidos (`/admin`)
- Detalhe (`/admin/pedidos/[id]`)
- Gestão de status com transições validadas no server

### Status suportados

`PENDING` · `CONFIRMED` · `PREPARING` · `READY` · `OUT_FOR_DELIVERY` · `COMPLETED` · `CANCELLED`

## Segurança

- Sessão admin em cookie HttpOnly (token **não** fica em `localStorage`)
- Credenciais admin via env; JWT com `ADMIN_JWT_SECRET`
- Mutações autorizadas no server (Server Actions)
- Sem API pública REST para pedidos/admin
- Pedidos contêm PII — painel e banco devem permanecer restritos
- `.env` fora do git; `.env.example` só com placeholders

## Testes

- Playwright E2E local (Chromium): menu, checkout/pedido, auth, dashboard, status PICKUP
- Helpers de cleanup só para pedidos com prefixo `E2E` + `E2E_ALLOW_DB_CLEANUP=true`

## CI

| Workflow | Escopo |
| --- | --- |
| Quality Checks | generate, lint, typecheck, build |
| E2E Tests | Postgres efêmero + migrate + seed + Playwright |

CI **não** faz deploy e **não** usa banco de produção.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma 6 · PostgreSQL · Zod · React Hook Form · jose · pnpm · Playwright · GitHub Actions

## Limitações conhecidas

- Sem CRUD de cardápio
- Sem upload de imagens
- Sem notificações em tempo real
- Sem WhatsApp Cloud API
- Sem pagamento online
- Sem múltiplos admins
- Sem histórico/auditoria de status
- Sem motivo de cancelamento
- Domínio customizado / polish PWA: pós-validação

## Checklist antes de publicar o link para clientes

Use o detalhamento em [production-checklist.md](../production-checklist.md). Resumo:

1. Actions verdes na `main`
2. Vercel + Neon (ou Supabase) configurados
3. Migrations aplicadas; WhatsApp da loja **real** no banco
4. Smoke produção (pedido teste + admin + status) **GO**
5. Validação com o dono no celular
6. Só então divulgar URL / bio / QR

## Próximas etapas após GO

1. Deploy controlado ([deployment.md](../deployment.md))
2. Ajuste fino de cardápio / taxas / horários com o dono
3. Domínio customizado (quando priorizado)
4. CRUD de cardápio / polish mobile / PWA conforme feedback
