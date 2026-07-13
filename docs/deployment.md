# Deploy — Na Brasa Digital Menu (produção controlada)

Guia para o **primeiro deploy real** do MVP: validar com o dono antes de divulgar o link para clientes.

Documentos relacionados:

- [Production checklist](production-checklist.md) (GO / NO-GO)
- [Operação](operations.md)
- [Release notes](release-notes/mvp-v0.1.0.md)
- [Testes / CI](testing.md)
- [README](../README.md)

## Arquitetura recomendada

```text
Cliente (mobile)  →  Vercel (Next.js 15)
                         │
                         ├── Prisma → Neon Postgres (recomendado)
                         │            ou Supabase Postgres (alternativa)
                         └── Server Actions (pedido + admin)
                                    │
                                    └── wa.me (link WhatsApp; sem Cloud API)
```

| Camada | Serviço sugerido | Notas |
| --- | --- | --- |
| App | **Vercel** | Install/build padrão Next.js |
| Banco | **Neon** (preferência) ou **Supabase Postgres** | Connection string com SSL |
| URL inicial | `*.vercel.app` | Domínio customizado: fora desta preparação |
| CI | GitHub Actions | Quality Checks + E2E usam banco **efêmero**, nunca produção |

Não use Docker, Express separado nem GitHub Actions de deploy automático nesta etapa.

## Fluxo Vercel + Neon (recomendado)

1. Crie o projeto/banco no **Neon** e copie a `DATABASE_URL` (com `sslmode=require` ou equivalente).
2. Crie o projeto na **Vercel**, conecte o repositório GitHub (`main`).
3. Configure as **Environment Variables** de Production (seção abaixo).
4. Faça o primeiro deploy (build automático).
5. Com `DATABASE_URL` apontando ao Neon, rode migrations (e seed só se bootstrap controlado).
6. Atualize `NEXT_PUBLIC_APP_URL` para a URL real (`https://….vercel.app`) e redeploy se necessário.
7. Execute o [smoke test](#smoke-test-em-produção) e o [checklist](production-checklist.md).

Alternativa de banco: **Supabase Postgres** — mesmo fluxo, só muda o provedor da connection string.

## Variáveis de ambiente (produção)

| Variável | Obrigatória | Produção |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Connection string do **banco remoto** (Neon/Supabase). Não use localhost. |
| `ADMIN_EMAIL` | Sim | E-mail do operador (não commitado) |
| `ADMIN_PASSWORD` | Sim | Senha **forte** (mín. 8 no schema; use senha longa e única) |
| `ADMIN_JWT_SECRET` | Sim | Segredo **longo e aleatório** (mín. 16; preferir 32+ chars) |
| `ADMIN_SESSION_COOKIE` | Sim | Ex.: `na-brasa-admin-session` |
| `NEXT_PUBLIC_APP_URL` | Sim | URL **final** HTTPS do deploy (ex.: `https://seu-app.vercel.app`) |
| `NEXT_PUBLIC_STORE_SLUG` | Sim | `na-brasa` (deve existir no banco) |
| `NODE_ENV` | Automático | Vercel define `production`; cookie admin usa `Secure` |

Placeholders locais (sem secrets reais): [`.env.example`](../.env.example).

### Como validar `DATABASE_URL`

1. A string aponta para o host do Neon/Supabase (não `localhost`).
2. Inclui SSL quando o provedor exige.
3. Com a env exportada na máquina de setup:

```bash
pnpm prisma migrate deploy
```

Se a connection string estiver errada, o comando falha imediatamente — corrija antes do smoke.

### Segurança das envs

- Nunca commitar `.env` / valores reais
- Não colar senha/JWT em issues, prints ou seeds
- Rotacionar `ADMIN_PASSWORD` / `ADMIN_JWT_SECRET` se houver vazamento
- Pedidos contêm PII — restringir acesso ao painel e ao banco

## Comandos

### Setup / apply no banco remoto

Com `DATABASE_URL` de produção na sessão (ou `.env` local apontando ao remoto **com cuidado**):

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy
# pnpm prisma db seed   # somente bootstrap controlado — ver abaixo
```

- **Dev:** `pnpm prisma migrate dev` (cria migrations)
- **Prod:** `pnpm prisma migrate deploy` (aplica as já versionadas; não cria novas)

Migrations devem rodar **antes** do smoke (ou logo após o primeiro deploy, com a URL remota). Não rode migrate destrutiva / reset no banco de produção.

### Build

```bash
pnpm build
```

Na Vercel o build padrão detecta Next.js; em geral **não** é necessário customizar install/build command.

### Seed / bootstrap

```bash
pnpm prisma db seed
```

O seed é idempotente e cria loja `na-brasa` + cardápio **fictício** + WhatsApp placeholder `5513999999999`.

Em produção real:

- Ajuste o seed **antes** de usar, **ou**
- Rode só como bootstrap e corrija WhatsApp/endereço/taxas/cardápio no banco, **ou**
- Pule o seed e cadastre a loja manualmente.

Não trate o seed de desenvolvimento como dados oficiais do cliente.

## Deploy na Vercel (passo a passo)

1. New Project → importe `na-brasa-digital-menu`
2. Framework: Next.js (auto)
3. Configure as envs de Production
4. Deploy a partir de `main`
5. Anote a URL `*.vercel.app` e alinhe `NEXT_PUBLIC_APP_URL`
6. Domínio customizado: depois da validação com o dono (fora deste guia operacional mínimo)

Não é obrigatório usar Vercel CLI. Não há workflow GitHub Actions de deploy nesta preparação.

## CI vs produção

| Pipeline | Banco | O que faz |
| --- | --- | --- |
| Quality Checks | Nenhum (envs fake) | generate, lint, typecheck, build |
| E2E Tests | Postgres **efêmero** no Actions | migrate + seed + Playwright |

**E2E CI nunca deve apontar para Neon/Supabase/produção.**

## Smoke test em produção

Ver também a seção completa em [production-checklist.md](production-checklist.md).

1. Abrir `/na-brasa` no celular
2. Adicionar produto → checkout
3. Criar **pedido teste** (dados fictícios)
4. Confirmar `wa.me` e mensagem coerente
5. Confirmar `Order` no banco
6. `/admin/login` → dashboard → detalhe → mudar status
7. Concluir ou cancelar o pedido teste

Qualquer falha → **NO-GO** (não divulgar o link).

## Rollback manual básico

1. Na Vercel: **Promote / Redeploy** do deployment anterior estável
2. **Não** rodar migration destrutiva nem `migrate reset` em produção
3. **Preservar o banco** (dados de pedidos são históricos)
4. Se necessário: remova/oculte temporariamente o link público enquanto corrige

## Troubleshooting inicial

| Sintoma | Verificar |
| --- | --- |
| Build ok, `/na-brasa` vazio/erro | Store `na-brasa` no banco? `NEXT_PUBLIC_STORE_SLUG`? Migrations aplicadas? |
| WhatsApp abre número errado | Campo `Store.whatsapp` (não deixar placeholder do seed) |
| Login admin falha | `ADMIN_EMAIL` / `ADMIN_PASSWORD` nas envs de Production; redeploy após mudar envs |
| Cookie / sessão estranha | HTTPS? `NODE_ENV=production`? `NEXT_PUBLIC_APP_URL` com `https://`? |
| Pedido não aparece no admin | Mesmo `DATABASE_URL` do app? Pedido criou no banco? |
| CI verde, produção quebrada | Envs reais vs fake; URL do app; migrate no remoto |

## O que este guia não cobre

- Domínio customizado DNS
- Deploy automático / Vercel CLI obrigatório
- Docker
- WhatsApp Cloud API / pagamento online / CRUD de cardápio
- Alteração de schema nesta preparação documental
