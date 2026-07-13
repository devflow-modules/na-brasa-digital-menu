# Na Brasa — Cardápio Online

Cardápio digital para o carrinho de lanches **Na Brasa**: lanches artesanais e espetinhos, com pedidos salvos no painel e finalização via WhatsApp.

## Visão

- Experiência mobile-first para o cliente montar o pedido no celular
- Painel simples para o operador acompanhar pedidos
- Finalização por link do WhatsApp com mensagem formatada (sem WhatsApp API na V1)
- Deploy previsto na Vercel

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Zod
- React Hook Form
- jose (JWT)
- pnpm

## Arquitetura (V1)

- Next.js fullstack (sem Express separado)
- Sem React Native
- PWA-ready no futuro
- Auth admin simples via JWT em cookie HttpOnly (sem provedor externo)

## Começando

### Pré-requisitos

- Node.js 20+
- pnpm
- PostgreSQL (quando for conectar o banco)

### Setup

```bash
pnpm install
cp .env.example .env
# Ajuste DATABASE_URL e demais variáveis em .env
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

### Scripts

| Comando | Descrição |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm start` | Sobe o build de produção |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) |
| `pnpm prisma:generate` | Gera o Prisma Client |
| `pnpm prisma:migrate` | Cria/aplica migrations (`migrate dev`) |
| `pnpm prisma:seed` | Seed idempotente do Na Brasa |
| `pnpm prisma:studio` | Prisma Studio |

### Banco de dados

- Schema: `prisma/schema.prisma` (Store, cardápio, pedidos com snapshots)
- Seed fictício: `prisma/seed.ts` (loja `na-brasa`, sem pedidos)
- Documentação: `docs/database.md`

WhatsApp no seed é **placeholder** (`5513999999999`), não número real.

### Rotas atuais

| Rota | Status |
| --- | --- |
| `/` | Redireciona para `/na-brasa` |
| `/na-brasa` | Cardápio público + carrinho local |
| `/na-brasa/checkout` | Checkout → cria pedido no server → abre WhatsApp (`wa.me`) |
| `/admin` | Dashboard de pedidos (protegido) |
| `/admin/login` | Login admin (cookie HttpOnly + JWT) |
| `/admin/pedidos/[id]` | Detalhe + ações de status (protegido) |

### Fluxo atual do cliente

```text
/na-brasa → monta carrinho local → /na-brasa/checkout → pedido salvo → wa.me
```

### Fluxo admin

```text
/admin → (sem sessão) /admin/login → cookie HttpOnly → dashboard de pedidos
/admin/pedidos/[id] → detalhe + ações de status controladas
```

## Roadmap MVP

1. **Fundação** — estrutura, Prisma base, env, páginas placeholder
2. **Modelagem de banco** — Store, cardápio, pedidos/snapshots e seed
3. **Catálogo público** — cardápio mobile-first em `/na-brasa`
4. **Carrinho** — estado do pedido no cliente
5. **Checkout (form)** — captura e valida dados do cliente
6. **Pedido + WhatsApp** — persistência, totais no server e link `wa.me` ✅
7. **Admin auth** — login/sessão para proteger o painel ✅
8. **Admin pedidos** — listagem, detalhe e atualização de status
9. **Admin gestão** — cardápio
10. **PWA / polish** — melhorias mobile e deploy Vercel

## Estrutura

```text
src/
  app/           # rotas (App Router)
  components/    # ui e layout
  features/      # menu, cart, checkout, orders, admin
  lib/           # prisma, env, utils
  server/        # repositories, services, actions
prisma/          # schema Prisma
docs/            # produto e decisões
```

## Variáveis de ambiente

Veja `.env.example`:

- `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_JWT_SECRET`
- `ADMIN_SESSION_COOKIE`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_STORE_SLUG`

Não versionar `.env` com credenciais reais.
