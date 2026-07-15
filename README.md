# Plataforma white-label de cardápio digital

Repositório da plataforma **multi-tenant** para cardápio online, pedidos salvos no banco, handoff via WhatsApp (`wa.me`) e painéis operacionais (`/admin` e `/master`). A **primeira implantação real** é o piloto do cliente **Na Braza** (`na-brasa`).

Muitos negócios de alimentação ainda recebem pedidos por WhatsApp de forma manual e fragmentada — sem cardápio claro, sem registro estruturado e com retrabalho para a equipe. A plataforma organiza esse fluxo: **cardápio público**, **carrinho**, **checkout**, **pedido persistido**, **mensagem pronta para o WhatsApp** e **acompanhamento no painel** da loja (e operação de plataforma quando aplicável).

## Identidade do produto

| | |
| --- | --- |
| **Produto** | Plataforma white-label multi-tenant |
| **Nome comercial** | Ainda não definido |
| **Nome interno provisório** | Digital Menu Platform (uso em documentação interna) |
| **Cliente 1** | Na Braza |
| **Slug técnico do cliente 1** | `na-brasa` |

## Piloto — Na Braza

| | |
| --- | --- |
| **Versão** | v0.1.0-pilot |
| **Status** | Pronto para validação controlada com o dono |
| **Produção** | https://na-brasa-cardapio.vercel.app/na-brasa |
| **Gate** | Smoke autenticado de Store Settings: **GO** (jul/2026) |

Escopo validado, limitações e aceite: [docs/releases/v0.1.0-pilot.md](docs/releases/v0.1.0-pilot.md).

## Capacidades atuais

**Fundação da plataforma (implementada):**

- Modelo `Store` e isolamento por `storeId`
- Autenticação DB-backed (`User`, roles, JWT em cookie HttpOnly)
- Painel da loja `/admin` (store-scoped) com RBAC
- Painel `/master` para operação de plataforma (`MASTER`)
- Gestão de usuários por loja em `/master/stores/[storeId]/users`

**Piloto Na Braza (tenant `na-brasa`):**

- Storefront público em `/na-brasa` (cardápio, carrinho local, checkout)
- Pedido persistido no PostgreSQL antes do WhatsApp
- Admin: pedidos, status, cardápio, adicionais, configurações da loja
- CI (quality + E2E) e deploy documentado (Vercel + PostgreSQL)

## Estado atual e limitações

| | |
| --- | --- |
| **Implementado** | Fluxos acima; ver [docs/product.md](docs/product.md) |
| **Fundação** | Multi-tenant no schema e nas rotas admin/master; storefront do piloto ainda em rota fixa `/na-brasa` |
| **Planejado** | Storefront público dinâmico por slug; CRUD completo de lojas no `/master`; onboarding self-service |
| **Fora do piloto** | Pagamento online, WhatsApp API, reset de senha no painel, upload de imagens, relatórios avançados — ver [docs/product.md](docs/product.md) |

## Stack

- Next.js 15 (App Router)
- TypeScript · Tailwind CSS · Prisma 6 · PostgreSQL
- Zod · React Hook Form · jose (JWT) · pnpm

## Rotas

### Públicas (piloto)

| Rota | Descrição |
| --- | --- |
| `/` | Redireciona para `/na-brasa` |
| `/na-brasa` | Cardápio + carrinho local |
| `/na-brasa/checkout` | Checkout → pedido no server → `wa.me` |

### Painel da loja

| Rota | Descrição |
| --- | --- |
| `/admin/login` | Login (`User` no banco) |
| `/admin` | Pedidos (store-scoped) |
| `/admin/pedidos/[id]` | Detalhe e status |
| `/admin/cardapio` | Categorias e produtos |
| `/admin/cardapio/adicionais` | Adicionais e vínculos |
| `/admin/configuracoes` | Settings da `Store` |

### Painel master (plataforma)

| Rota | Descrição |
| --- | --- |
| `/master` | Dashboard (`MASTER` apenas) |
| `/master/stores/[storeId]/users` | Usuários da loja |

## Setup local

**Pré-requisitos:** Node.js 22+, pnpm 11, PostgreSQL.

```bash
pnpm install
cp .env.example .env
# Ajuste DATABASE_URL, ADMIN_JWT_SECRET, MASTER_ADMIN_*, NEXT_PUBLIC_*
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

O seed cria o tenant piloto `na-brasa` (cardápio fictício, WhatsApp placeholder). Detalhes: [docs/database.md](docs/database.md).

## Scripts

### Desenvolvimento e plataforma

| Comando | Descrição |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` / `pnpm start` | Build e produção local |
| `pnpm lint` / `pnpm typecheck` | Qualidade estática |
| `pnpm test` | Teste unitário (permissões admin) |
| `pnpm test:e2e` | Playwright (Desktop Chrome + Mobile Chrome / Pixel 5) |
| `pnpm prisma:generate` / `migrate` / `seed` / `studio` | Prisma |

### Scripts específicos do piloto Na Braza

Definidos em `package.json`; usam `DATABASE_URL` e afetam a loja **Na Braza** (`na-brasa`), não um onboarding genérico de novos tenants:

| Script npm | Uso |
| --- | --- |
| `pnpm store:apply-na-braza-settings` | Aplica settings operacionais do piloto |
| `pnpm menu:apply-na-braza-pilot` | Aplica cardápio do piloto |
| `pnpm store:create-na-braza-owner` | Cria usuário dono da loja piloto |
| `pnpm data:clean-na-braza-tests` / `data:purge-na-braza-tests` | Limpeza de dados de teste do piloto |

## Testes

Guia: [docs/testing.md](docs/testing.md). CI: Quality Checks + E2E (Postgres efêmero). E2E exercita principalmente o tenant `na-brasa`.

## Deploy

- **App:** Vercel · **Banco:** Neon ou Supabase Postgres
- Guias: [docs/deployment.md](docs/deployment.md) · [docs/production-checklist.md](docs/production-checklist.md)

```bash
pnpm prisma migrate deploy
pnpm build
```

Seed em produção só com bootstrap controlado; ver [docs/deployment.md](docs/deployment.md).

## Variáveis de ambiente

Ver `.env.example`. Principais: `DATABASE_URL`, `ADMIN_JWT_SECRET`, `ADMIN_SESSION_COOKIE`, `MASTER_ADMIN_*` (seed do `MASTER`), `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STORE_SLUG` (piloto: `na-brasa`).

`ADMIN_EMAIL` / `ADMIN_PASSWORD` estão **obsoletos** no runtime de login.

## Segurança e isolamento

- Sessão admin: JWT em cookie **HttpOnly** (`ADMIN_JWT_SECRET`); não usar `localStorage` para sessão.
- Login **DB-backed** (`User` + `passwordHash` com bcrypt); bootstrap do primeiro `MASTER` via `MASTER_ADMIN_*` no seed.
- **RBAC** por `UserRole` no `/admin`; permissões validadas no server (não só na UI).
- Usuários de loja vinculados a uma **Store** (`storeId`); operações admin tenant-scoped.
- Isolamento de pedidos e catálogo por **`storeId`** nas queries/mutações aplicáveis.
- Pedidos: preços e totais **recalculados no servidor**; produtos/adicionais indisponíveis bloqueados no server.
- **`MASTER`:** contexto de plataforma em `/master`; em `/admin` acesso transitório à Store de `NEXT_PUBLIC_STORE_SLUG` — distinto de usuários só da loja.
- Segredos e `.env` reais **não** versionados; ver `.env.example` e [docs/deployment.md](docs/deployment.md). Decisão de auth multi-admin: [docs/adr/0002-database-backed-multi-admin-and-master-panel.md](docs/adr/0002-database-backed-multi-admin-and-master-panel.md).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [docs/product.md](docs/product.md) | Produto da plataforma e piloto |
| [docs/releases/v0.1.0-pilot.md](docs/releases/v0.1.0-pilot.md) | Escopo e smoke do piloto Na Braza |
| [docs/production-checklist.md](docs/production-checklist.md) | GO/NO-GO e aceite do cliente |
| [docs/operations.md](docs/operations.md) | Operação diária (piloto Na Braza) |
| [docs/database.md](docs/database.md) | Schema, seed, multi-tenant |
| [docs/deployment.md](docs/deployment.md) | Vercel, envs, auth |
| [docs/testing.md](docs/testing.md) | E2E e CI |
| [docs/client/na-braza-pilot-data.md](docs/client/na-braza-pilot-data.md) | Dados operacionais do cliente 1 |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de mudanças do repositório |
| [.cursor/README.md](.cursor/README.md) | Tooling operacional (desenvolvimento assistido no Cursor) |

ADRs: [docs/adr/](docs/adr/).

## Estrutura do repositório

```text
src/
  app/           # rotas App Router (público piloto, /admin, /master)
  components/    # UI compartilhada
  features/      # domínios (orders, admin, master, menu, …)
  lib/           # prisma, env, utilitários
prisma/          # schema e migrations
docs/            # produto, deploy, operação
.cursor/         # rules, agents, workflows (ver commit e259dc1)
```

Lógica de negócio e acesso a dados ficam em `src/features/<domínio>/` (`*.repository.ts`, `*.service.ts`, actions, components).

## Roadmap (resumo)

1. Aceite do piloto Na Braza e dados reais finais
2. Divulgação controlada do link / QR
3. Evolução da plataforma (storefront por slug, CRUD de lojas, etc.) conforme [docs/product.md](docs/product.md)
