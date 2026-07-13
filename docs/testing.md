# Testing — Na Brasa Digital Menu

Guia dos testes E2E (Playwright) e do Playwright MCP no Cursor.

Documentos relacionados: [README](../README.md) · [Deploy](deployment.md) · [Operação](operations.md)

## Escopo coberto

| Spec | Fluxo |
| --- | --- |
| `tests/e2e/public-menu.spec.ts` | Cardápio, carrinho, persistência local, CTA checkout |
| `tests/e2e/checkout-order.spec.ts` | Checkout → Order PENDING → `wa.me` → limpa carrinho |
| `tests/e2e/admin-auth.spec.ts` | Redirect, login inválido/válido, logout |
| `tests/e2e/admin-orders.spec.ts` | Lista + detalhe de pedido E2E |
| `tests/e2e/admin-status.spec.ts` | PICKUP: PENDING → … → COMPLETED |

Browser: **Chromium** apenas.

## Pré-requisitos

- Node.js 22+ (pnpm 11 exige ≥ 22.13)
- pnpm 11
- PostgreSQL local (não use banco de produção)
- `.env` a partir de `.env.example` com:
  - `DATABASE_URL`
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `ADMIN_JWT_SECRET`
  - `ADMIN_SESSION_COOKIE`
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_STORE_SLUG`
- Loja seedada:

```bash
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
```

Opcional: `.env.test.local` (não commitado; já coberto por `.env*.local` no `.gitignore`) para sobrescrever envs só nos testes.

## Instalar browsers do Playwright

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

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

## CI vs E2E local

O workflow GitHub Actions `Quality Checks` (`.github/workflows/quality.yml`) valida automaticamente em PRs/`push` para `main`:

- `pnpm prisma generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

Nesta etapa o CI **não** sobe Postgres, **não** aplica migrations/seed e **não** executa Playwright.

E2E continua **local/manual**:

```bash
pnpm prisma db seed
pnpm test:e2e
```

Futuro (fora deste escopo): workflow E2E com service Postgres + Playwright no CI.

## Limitações

- Sem Firefox/WebKit nesta suíte E2E
- Sem Playwright no CI (ainda)
- Sem Playwright Cloud
- Status E2E cobre fluxo PICKUP até COMPLETED (não cobre OUT_FOR_DELIVERY nesta suíte)
- Pedidos de status/dashboard são criados via helper Prisma (integração UI nos cliques de status e auth)
