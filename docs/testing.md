# Testing — Na Brasa Digital Menu

Guia dos testes E2E (Playwright) e do Playwright MCP no Cursor.

Documentos relacionados: [README](../README.md) · [Deploy](deployment.md) · [Operação](operations.md)

## Escopo coberto

| Spec | Fluxo |
| --- | --- |
| `tests/e2e/public-menu.spec.ts` | Cardápio, carrinho, persistência local, CTA checkout |
| `tests/e2e/checkout-order.spec.ts` | Checkout → Order PENDING → `wa.me` → limpa carrinho |
| `tests/e2e/admin-auth.spec.ts` | Redirect, senha inválida, user inativo, login DB, claims JWT, logout |
| `tests/e2e/master-dashboard.spec.ts` | `/master` auth: redirect, MASTER ok, non-MASTER blocked, lista `na-brasa`, logout |
| `tests/e2e/master-store-users.spec.ts` | usuários por Store: auth, create OPERATOR, login `/admin`, block MASTER role option, e-mail duplicado, isActive |
| `tests/e2e/admin-store-scope.spec.ts` | Isolamento por Store no `/admin` (lista/detalhe/status/MASTER transicional) |
| `tests/e2e/admin-orders.spec.ts` | Lista + detalhe de pedido E2E |
| `tests/e2e/admin-status.spec.ts` | PICKUP: PENDING → … → COMPLETED |
| `tests/e2e/admin-role-permissions.spec.ts` | Permissões por role (OWNER/MANAGER/OPERATOR/KITCHEN/MASTER) + bypass server-side |
| `tests/e2e/admin-menu-management.spec.ts` | `/admin/cardapio`: CRUD simples, toggles, escopo por Store, publicação (`active`) |
| `tests/e2e/product-availability.spec.ts` | `active` vs `available`: badge público, bloqueio carrinho/checkout, permissões OPERATOR |
| `tests/e2e/admin-addon-management.spec.ts` | `/admin/cardapio/adicionais`: CRUD, vínculos, público, permissões, order validation |

Browser: **Chromium** apenas.

## Pré-requisitos

- Node.js 22+ (pnpm 11 exige ≥ 22.13)
- pnpm 11
- PostgreSQL local (não use banco de produção)
- `.env` a partir de `.env.example` com:
  - `DATABASE_URL`
  - `ADMIN_JWT_SECRET`
  - `ADMIN_SESSION_COOKIE`
  - `MASTER_ADMIN_NAME` / `MASTER_ADMIN_EMAIL` / `MASTER_ADMIN_PASSWORD` (preferido para login E2E via seed)
  - ou, como fixture local: `ADMIN_EMAIL` / `ADMIN_PASSWORD` (só para o helper E2E criar `User` no banco — **não** usados pelo runtime)
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_STORE_SLUG`
- Loja + usuário admin seedados:

```bash
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
```

Os helpers E2E também fazem upsert de um `MASTER` de teste (`ensureE2eAdminUser`) antes do login.

Opcional: `.env.test.local` (não commitado; já coberto por `.env*.local` no `.gitignore`) para sobrescrever envs só nos testes.

## Instalar browsers do Playwright

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

## Testes unitários (matriz de permissões)

Sem Vitest — usa o runner nativo do Node via `tsx`:

```bash
pnpm test
```

Arquivo: `src/features/admin/auth/admin-permissions.test.ts` (role × transição).

## Rodar E2E

```bash
pnpm test:e2e
```

Outros scripts:

| Comando | Descrição |
| --- | --- |
| `pnpm test:e2e:ui` | UI Mode do Playwright |
| `pnpm test:e2e:debug` | Debug step-by-step |
| `pnpm test:e2e:report` | Abre o HTML report |

O `playwright.config.ts` sobe `pnpm dev` em `http://127.0.0.1:3000` (`reuseExistingServer: true`).

## Relatório e artifacts

Em falha, Playwright gera:

- `playwright-report/`
- `test-results/`

Esses diretórios estão no `.gitignore` (não versionar screenshots/traces/vídeos).

```bash
pnpm test:e2e:report
```

## Cleanup de dados E2E

Helpers em `tests/e2e/helpers/db.ts`:

- Só apagam pedidos cujo `customerName` começa com `E2E`
- Exigem `E2E_ALLOW_DB_CLEANUP=true`
- Bloqueiam se `NODE_ENV=production`
- Não apagam o banco inteiro nem pedidos reais

Nomes de cliente de teste usam prefixo `E2E` + timestamp (ex.: `E2E Pickup Customer 171000…`).

## Segurança

- Não apontar `DATABASE_URL` para produção
- Não commitar secrets (`.env`, `.env*.local`)
- Credenciais admin de teste devem ser locais/fictícias
- O fluxo abre `wa.me` no browser de teste; **não** envia via WhatsApp Cloud API
- Cleanup apenas de registros E2E

## Playwright MCP (Cursor)

O projeto não exige MCP para build/CI. Para exploração assistida no Cursor (dev only):

1. Cursor Settings → MCP → Add new MCP Server
2. Use o comando oficial:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Há um exemplo versionado em [`.cursor/mcp.playwright.example.json`](../.cursor/mcp.playwright.example.json).

Notas:

- MCP é **opcional** e separado do runner `pnpm test:e2e`
- Não commitar tokens/configs pessoais do Cursor
- Preferir Chromium local; não usar conta/produção do cliente

## CI básico vs E2E no CI

### Quality Checks (leve)

Arquivo: [`.github/workflows/quality.yml`](../.github/workflows/quality.yml)

- Gatilhos: `pull_request` / `push` em `main`
- Sem Postgres
- Roda: `prisma generate` → lint → typecheck → build

### E2E Tests (pesado)

Arquivo: [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml)

- Gatilhos: `pull_request` / `push` em `main`
- Service: **Postgres 16** (`na_brasa_e2e` em `localhost:5432`)
- Node **22** + pnpm **11** (Node 20 incompatível com pnpm 11)
- Passos: install → `prisma generate` → `migrate deploy` → `db seed` → Playwright Chromium → `pnpm test:e2e`
- `E2E_ALLOW_DB_CLEANUP=true` no job (cleanup só de pedidos com prefixo `E2E`)
- `NODE_ENV=test` (não production)
- App sobe pelo `webServer` do Playwright (`pnpm dev`)
- Em falha: upload de `playwright-report/` e `test-results/` (retenção 7 dias)

Envs do CI são **fake** (sem Neon/Supabase, sem secrets reais).

### Reproduzir localmente (equivalente ao CI)

```bash
# Postgres local apontando em DATABASE_URL no .env
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy   # ou: pnpm prisma migrate dev
pnpm prisma db seed
pnpm exec playwright install chromium
E2E_ALLOW_DB_CLEANUP=true pnpm test:e2e
```

## Limitações

- Sem Firefox/WebKit nesta suíte E2E
- Sem Playwright Cloud / multi-browser
- Status E2E cobre fluxo PICKUP até COMPLETED (não cobre OUT_FOR_DELIVERY nesta suíte)
- Pedidos de status/dashboard são criados via helper Prisma (integração UI nos cliques de status e auth)
