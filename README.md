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
| `ADMIN_EMAIL` | E-mail do login admin |
| `ADMIN_PASSWORD` | Senha do admin (mín. 8 chars; use senha forte em produção) |
| `ADMIN_JWT_SECRET` | Segredo JWT (mín. 16 chars; use valor longo e aleatório) |
| `ADMIN_SESSION_COOKIE` | Nome do cookie de sessão |
| `NEXT_PUBLIC_APP_URL` | URL pública do app (ex.: `https://seu-dominio.vercel.app`) |
| `NEXT_PUBLIC_STORE_SLUG` | Slug da loja (`na-brasa`) |
| `NODE_ENV` | Definido pelo runtime (`development` / `production`); em produção o cookie admin usa `Secure` |

Não versionar `.env` com credenciais reais. Nunca commitar `ADMIN_PASSWORD` ou `ADMIN_JWT_SECRET` reais.

### Segurança (resumo)

- Sessão admin: JWT em cookie **HttpOnly** (não fica em `localStorage`)
- Pedidos contêm PII (nome, telefone, endereço) — proteger o painel
- Envs nunca devem ser commitadas
- `ADMIN_PASSWORD` forte; `ADMIN_JWT_SECRET` longo e aleatório

Mais detalhes: [docs/deployment.md](docs/deployment.md).

## Deploy recomendado

- **App:** Vercel
- **Banco:** Neon ou Supabase Postgres (ou outro PostgreSQL gerenciado)

Guia completo: [docs/deployment.md](docs/deployment.md).

## Checklist de produção

- [ ] `DATABASE_URL` aponta para banco remoto
- [ ] Migrations aplicadas (`pnpm prisma migrate deploy`)
- [ ] Seed executado **ou** loja cadastrada com dados reais
- [ ] WhatsApp da loja configurado no banco (não o placeholder do seed)
- [ ] `ADMIN_EMAIL` definido
- [ ] `ADMIN_PASSWORD` forte
- [ ] `ADMIN_JWT_SECRET` forte (longo e aleatório)
- [ ] `NEXT_PUBLIC_APP_URL` com URL HTTPS de produção
- [ ] `NEXT_PUBLIC_STORE_SLUG` correto
- [ ] Build passa (`pnpm build`)
- [ ] `/na-brasa` carrega
- [ ] Pedido teste cria `Order` no banco
- [ ] `wa.me` abre com mensagem coerente
- [ ] `/admin/login` funciona
- [ ] `/admin` lista o pedido
- [ ] Status muda no painel

Checklist ampliado e smoke de produção: [docs/deployment.md](docs/deployment.md).

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

1. Deploy e validação real com o cliente
2. Ajuste de cardápio/WhatsApp com dados reais
3. CRUD de cardápio (quando priorizado)
4. PWA / polish mobile
