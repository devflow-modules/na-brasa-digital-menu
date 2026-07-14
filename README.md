# Na Brasa — Cardápio Online

Cardápio digital para o carrinho de lanches **Na Brasa**: lanches artesanais e espetinhos, com pedidos salvos no painel e finalização via WhatsApp.

## Current status

**v0.1.0-pilot ready** — validated for controlled pilot with the Na Brasa owner.

Core capabilities:

- public menu (`/na-brasa`), cart, checkout
- WhatsApp order handoff (`wa.me`)
- admin orders and status workflow
- role-based access (store-scoped `/admin`)
- menu and catalog management (`/admin/cardapio`)
- addons (`/admin/cardapio/adicionais`)
- Store settings (`/admin/configuracoes`)
- platform user management (`/master`)
- E2E tests, CI, and production deploy (Vercel + PostgreSQL)

Release notes: [docs/releases/v0.1.0-pilot.md](docs/releases/v0.1.0-pilot.md) · [CHANGELOG](CHANGELOG.md)

## Product positioning

Na Brasa Digital Menu is the first tenant/client implementation of **DevFlow Menu**, a white-label online menu and WhatsApp order platform for small food businesses. This repository is the Na Brasa deployment; capabilities are documented for pilot operation, not as a generic SaaS product yet.

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
- [Release notes v0.1.0-pilot](docs/releases/v0.1.0-pilot.md)
- [Release notes MVP v0.1.0 (histórico)](docs/release-notes/mvp-v0.1.0.md)

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
| `/admin/cardapio` | Gestão de categorias e produtos |
| `/admin/cardapio/adicionais` | Gestão de adicionais e vínculos |
| `/admin/configuracoes` | Configurações operacionais da loja |
| `/master` | Painel plataforma (somente `MASTER`) |
| `/master/stores/[storeId]/users` | Usuários da loja |

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

O projeto está em **v0.1.0-pilot**: deploy em produção validado com smoke de Store Settings (GO). Próximo passo é aceite do cliente com dados reais e divulgação controlada do link.

| Documento | Uso |
| --- | --- |
| [docs/releases/v0.1.0-pilot.md](docs/releases/v0.1.0-pilot.md) | Escopo do piloto, smoke validado, limitações |
| [docs/deployment.md](docs/deployment.md) | Vercel + Neon, envs, migrate/seed, rollback |
| [docs/production-checklist.md](docs/production-checklist.md) | GO/NO-GO, aceite do cliente, smoke piloto |
| [docs/release-notes/mvp-v0.1.0.md](docs/release-notes/mvp-v0.1.0.md) | Notas históricas do MVP inicial |

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

## Limitações conhecidas (piloto)

- Sem WhatsApp Cloud API
- Sem pagamento online
- Sem zonas de entrega / múltiplas áreas
- Sem horário por dia da semana (apenas texto livre em `openingHours`)
- Sem reset de senha no painel
- Sem upload de imagens no admin
- Sem notificações em tempo real (WebSocket/polling)
- Sem CRUD de lojas no `/master` (apenas usuários por loja)
- Sem histórico/auditoria de status na UI
- Sem motivo de cancelamento estruturado

## Roadmap (pós-piloto)

1. Aceite do cliente e dados reais finais ([production-checklist.md](docs/production-checklist.md))
2. Tag `v0.1.0-pilot` e divulgação controlada (link / QR)
3. Domínio customizado (quando priorizado)
4. Melhorias pós-feedback (notificações, pagamento, WhatsApp API — fora do piloto atual)
