# Na Brasa — Cardápio Online

Cardápio digital para o carrinho de lanches **Na Brasa**: lanches artesanais e espetinhos, com pedidos salvos no painel e finalização via WhatsApp.

## Visão geral do MVP

O MVP operacional permite:

1. Cliente monta o pedido no celular (`/na-brasa`)
2. Preenche o checkout e o pedido é **salvo no banco**
3. Abre o WhatsApp com mensagem pronta (`wa.me` — sem WhatsApp API)
4. Operador faz login no admin, vê pedidos e atualiza o status

Documentação relacionada:

- [Produto](docs/product.md)
- [Banco de dados](docs/database.md)
- [Deploy](docs/deployment.md)
- [Production checklist](docs/production-checklist.md)
- [Operação](docs/operations.md)
- [Testes E2E](docs/testing.md)
- [Release notes MVP v0.1.0](docs/release-notes/mvp-v0.1.0.md)

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Prisma 6 + PostgreSQL
- Zod
- React Hook Form
- jose (JWT em cookie HttpOnly)
- pnpm

## Rotas principais

### Públicas

| Rota | Descrição |
| --- | --- |
| `/` | Redireciona para `/na-brasa` |
| `/na-brasa` | Cardápio público + carrinho local |
| `/na-brasa/checkout` | Checkout → cria pedido no server → abre WhatsApp (`wa.me`) |

### Admin

| Rota | Descrição |
| --- | --- |
| `/admin/login` | Login (cookie HttpOnly + JWT) |
| `/admin` | Dashboard de pedidos (protegido) |
| `/admin/pedidos/[id]` | Detalhe + ações de status (protegido) |

## Fluxo do cliente

1. Acessa o cardápio em `/na-brasa`
2. Adiciona produtos e adicionais ao carrinho (estado local)
3. Preenche o checkout em `/na-brasa/checkout`
4. Pedido é salvo no banco (totais recalculados no server)
5. WhatsApp abre com a mensagem formatada (`wa.me`)

```text
/na-brasa → carrinho local → /na-brasa/checkout → Order no banco → wa.me
```

## Fluxo do admin

1. Faz login em `/admin/login`
2. Visualiza pedidos em `/admin`
3. Abre o detalhe em `/admin/pedidos/[id]`
4. Atualiza o status com ações controladas (validadas no server)

```text
/admin/login → /admin → /admin/pedidos/[id] → atualiza status
```

### Status do pedido

| Enum | Label |
| --- | --- |
| `PENDING` | Pendente |
| `CONFIRMED` | Confirmado |
| `PREPARING` | Em preparo |
| `READY` | Pronto |
| `OUT_FOR_DELIVERY` | Saiu para entrega |
| `COMPLETED` | Concluído |
| `CANCELLED` | Cancelado |

Detalhes de operação: [docs/operations.md](docs/operations.md).

## Setup local

### Pré-requisitos

- Node.js 22+ (CI usa Node 22; pnpm 11 exige ≥ 22.13)
- pnpm 11
- PostgreSQL

### Passos

```bash
pnpm install
cp .env.example .env
# Ajuste DATABASE_URL e demais variáveis em .env
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

O seed cria a loja `na-brasa` com cardápio fictício e WhatsApp **placeholder** (`5513999999999`). Não use o número do seed em produção real sem ajustar.

## Comandos

### Desenvolvimento

| Comando | Descrição |
| --- | --- |
| `pnpm install` | Instala dependências |
| `pnpm prisma generate` | Gera o Prisma Client |
| `pnpm prisma migrate dev` | Cria/aplica migrations (dev) |
| `pnpm prisma db seed` | Seed idempotente do Na Brasa |
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) |
| `pnpm build` | Build de produção |
| `pnpm test:e2e` | Playwright E2E (Chromium) |

Aliases do `package.json`: `pnpm prisma:generate`, `pnpm prisma:migrate`, `pnpm prisma:seed`, `pnpm prisma:studio`, `pnpm test:e2e:ui`, `pnpm test:e2e:debug`, `pnpm test:e2e:report`.

Guia completo: [docs/testing.md](docs/testing.md).

### CI (GitHub Actions)

Há dois workflows separados (PR / push em `main`), ambos com Node **22** + pnpm **11** e envs fake:

| Workflow | Arquivo | O que valida |
| --- | --- | --- |
| **Quality Checks** | [`.github/workflows/quality.yml`](.github/workflows/quality.yml) | `prisma generate`, lint, typecheck, build (sem banco) |
| **E2E Tests** | [`.github/workflows/e2e.yml`](.github/workflows/e2e.yml) | Postgres 16 + migrate + seed + Playwright Chromium |

O E2E sobe o app via `playwright.config.ts` (`pnpm dev` em `http://127.0.0.1:3000`), usa cleanup só para pedidos `E2E*` e sobe artifacts (`playwright-report/`, `test-results/`) só em falha.

Guia completo: [docs/testing.md](docs/testing.md).

### Produção (após configurar envs)

```bash
pnpm prisma migrate deploy
# pnpm prisma db seed   # só se for bootstrap controlado — ver nota abaixo
pnpm build
```

**Seed em produção:** o seed atual usa dados fictícios (incluindo WhatsApp placeholder). Em produção real, ajuste o seed antes de executar ou cadastre a loja/WhatsApp de forma controlada. Não trate o seed de desenvolvimento como dados oficiais do cliente.

## Variáveis de ambiente

Veja `.env.example`. Obrigatórias / usadas pelo app:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | PostgreSQL (Prisma) |
| `ADMIN_JWT_SECRET` | Segredo JWT da sessão admin (mín. 16; preferir 32+) |
| `ADMIN_SESSION_COOKIE` | Nome do cookie de sessão |
| `MASTER_ADMIN_NAME` | Seed: nome do usuário `MASTER` |
| `MASTER_ADMIN_EMAIL` | Seed: e-mail do `MASTER` (login admin) |
| `MASTER_ADMIN_PASSWORD` | Seed: senha do `MASTER` (hash no banco; nunca commitar) |
| `NEXT_PUBLIC_APP_URL` | URL pública do app (ex.: `https://seu-dominio.vercel.app`) |
| `NEXT_PUBLIC_STORE_SLUG` | Slug da loja (`na-brasa`) |
| `NODE_ENV` | Definido pelo runtime; em produção o cookie admin usa `Secure` |

`ADMIN_EMAIL` / `ADMIN_PASSWORD` estão **deprecated** (não autenticam mais o `/admin`).

Não versionar `.env` com credenciais reais. Nunca commitar `MASTER_ADMIN_PASSWORD` ou `ADMIN_JWT_SECRET` reais.

### Segurança (resumo)

- Sessão admin: JWT em cookie **HttpOnly** (não fica em `localStorage`)
- Login via tabela `User` (bcrypt); sem senha padrão hardcoded
- Pedidos contêm PII (nome, telefone, endereço) — proteger o painel
- Envs nunca devem ser commitadas
- `ADMIN_JWT_SECRET` longo e aleatório; senha do admin forte no bootstrap

Mais detalhes: [docs/deployment.md](docs/deployment.md).

## Production readiness

O MVP está em **Production Validation Candidate**: pronto para deploy controlado (Vercel + Neon/Supabase), smoke real e validação com o dono **antes** de divulgar o link aos clientes.

| Documento | Uso |
| --- | --- |
| [docs/deployment.md](docs/deployment.md) | Vercel + Neon, envs, migrate/seed, rollback, troubleshooting |
| [docs/production-checklist.md](docs/production-checklist.md) | Checklist GO/NO-GO (pré-deploy → smoke → dono) |
| [docs/release-notes/mvp-v0.1.0.md](docs/release-notes/mvp-v0.1.0.md) | Features, CI, limitações, gate antes de publicar |

### CI atual

| Workflow | Escopo |
| --- | --- |
| **Quality Checks** | `prisma generate`, lint, typecheck, build |
| **E2E Tests** | Postgres efêmero + migrate + seed + Playwright |

Não há deploy automático nesta etapa. E2E CI **não** usa banco de produção.

## Deploy recomendado

- **App:** Vercel
- **Banco:** Neon (recomendado) ou Supabase Postgres
- **URL inicial:** `*.vercel.app` (domínio customizado depois da validação)

Guia: [docs/deployment.md](docs/deployment.md). Checklist: [docs/production-checklist.md](docs/production-checklist.md).

## Checklist de produção (resumo)

Use o checklist completo: [docs/production-checklist.md](docs/production-checklist.md).

- [ ] Actions verdes na `main`
- [ ] `DATABASE_URL` remoto + migrations
- [ ] WhatsApp da loja real no banco
- [ ] Envs admin fortes na Vercel
- [ ] Smoke: pedido teste → `wa.me` → admin → status
- [ ] Validação com o dono no celular

## Arquitetura (V1)

- Next.js fullstack (sem Express separado)
- Sem React Native
- Auth admin simples via JWT em cookie HttpOnly (sem provedor externo)
- Sem WhatsApp Business API / pagamento online na V1

## Estrutura

```text
src/
  app/           # rotas (App Router)
  components/    # ui e layout
  features/      # menu, cart, checkout, orders, admin
  lib/           # prisma, env, utils
  server/        # repositories, services, actions
prisma/          # schema Prisma
docs/            # produto, deploy, operação, release notes
```

## Limitações conhecidas do MVP

- Sem CRUD de cardápio no admin
- Sem upload de imagens
- Sem notificações em tempo real (WebSocket/polling)
- Sem WhatsApp Cloud API
- Sem pagamento online
- Sem múltiplos admins
- Sem histórico/auditoria de status
- Sem motivo de cancelamento

## Roadmap (próximos passos)

1. Deploy controlado + checklist GO ([production-checklist.md](docs/production-checklist.md))
2. Validação com o dono e ajuste de cardápio/WhatsApp reais
3. Domínio customizado (quando priorizado)
4. CRUD de cardápio / PWA / polish mobile
