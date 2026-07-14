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
| `ADMIN_JWT_SECRET` | Sim | Segredo **longo e aleatório** de sessão JWT (mín. 16; preferir 32+). |
| `ADMIN_SESSION_COOKIE` | Sim | Ex.: `na-brasa-admin-session`. Nome do cookie HttpOnly. |
| `MASTER_ADMIN_NAME` | Seed | Nome do `MASTER` no bootstrap. Não é lido pelo login runtime. |
| `MASTER_ADMIN_EMAIL` | Seed | E-mail do `MASTER`. Sem as três `MASTER_ADMIN_*`, o seed não cria usuário e `/admin` fica sem login. |
| `MASTER_ADMIN_PASSWORD` | Seed | Senha forte do `MASTER` (hash `bcryptjs` no banco). Nunca logar nem commitar. |
| `NEXT_PUBLIC_APP_URL` | Sim | URL **final** HTTPS do deploy |
| `NEXT_PUBLIC_STORE_SLUG` | Sim | `na-brasa` (deve existir no banco) |
| `NODE_ENV` | Automático | Vercel define `production`; cookie admin usa `Secure` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Não | **Deprecated** — removidos do runtime de `/admin/login`. Auth é via tabela `User`. |

Placeholders locais (sem secrets reais): [`.env.example`](../.env.example).

### Auth (database-backed)

- Login em `/admin/login` valida `User` no banco (`email` + `passwordHash` com `bcryptjs.compare`).
- Sessão JWT (cookie HttpOnly, path `/`) inclui `userId`, `name`, `email`, `role`, `storeId`.
- Usuário `isActive === false` não autentica (mensagem genérica).
- **`/master`**: apenas `MASTER` (`requireMasterSession`). Sem sessão → login; outras roles → `notFound()`.
- **Usuários de loja:** `MASTER` gerencia em `/master/stores/[storeId]/users` (criar / ativar-desativar / role). Sem `MASTER_ADMIN_*` na Vercel Production.
- `/admin` = painel da loja (**store-scoped**). Usuários de loja precisam de `storeId`. `MASTER` ainda pode abrir `/admin` de forma **transicional** na Store de `NEXT_PUBLIC_STORE_SLUG`.
- Ambiente novo: `pnpm prisma migrate deploy` + seed com `MASTER_ADMIN_*` preenchidos.
- Permissões por role no `/admin` já são aplicadas **server-side** para ações de status de pedido; futuras permissões podem expandir para CRUD de cardápio, usuários e configurações. Reset de senha = roadmap.

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
- Rotacionar `ADMIN_JWT_SECRET` (e senha do `User` no banco) se houver vazamento
- Remover `ADMIN_EMAIL` / `ADMIN_PASSWORD` das envs de produção após o cutover (já não são usadas no login)
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

O seed é um **bootstrap técnico** idempotente: cria loja `na-brasa` + cardápio **fictício** **somente quando ainda não existem**.

- Store existente: **não** sobrescreve WhatsApp, endereço, horários, taxas, pedido mínimo ou flags operacionais.
- Placeholder WhatsApp `5513999999999` aplica-se **apenas** na primeira criação da Store.
- Categorias/produtos/adicionais existentes: **não** são reescritos (só cria ausentes).

Se `MASTER_ADMIN_NAME`, `MASTER_ADMIN_EMAIL` e `MASTER_ADMIN_PASSWORD` estiverem definidos na sessão, também faz upsert do usuário plataforma (`role = MASTER`, `storeId` null). Não usa `ADMIN_*` para isso e não há senha padrão.

Em produção real:

- Prefira seed **só** no bootstrap inicial (ou banco vazio), **ou**
- Cadastre/ajuste loja e cardápio real no banco após o bootstrap, **ou**
- Pule o seed e cadastre a loja manualmente.
- Para bootstrap do `MASTER`, defina as três envs `MASTER_ADMIN_*` com valores reais fortes (nunca placeholders inseguros em produção).
- **Não** depende do seed para “atualizar” dados oficiais — ele não substitui configuração operacional já presente.

Não trate o seed de desenvolvimento como dados oficiais do cliente.

## Deploy na Vercel (passo a passo)

1. New Project → importe `na-brasa-digital-menu` **ou** use `pnpm dlx vercel` (projeto já pode existir: `na-brasa-cardapio`)
2. Framework: Next.js (auto)
3. Configure as envs de Production **no painel ou via CLI** (não dependa do `.env` local)
4. Deploy a partir de `main` / `pnpm dlx vercel --prod`
5. Anote a URL `*.vercel.app` e alinhe `NEXT_PUBLIC_APP_URL`
6. Domínio customizado: depois da validação com o dono (fora deste guia operacional mínimo)

### Não enviar `.env` no upload do CLI

O `.vercelignore` do repositório impede o upload de arquivos locais sensíveis (`.env`, `.env.local`, `*.env`, artifacts do Playwright).

Produção deve usar **somente** variáveis configuradas na Vercel (Settings → Environment Variables ou `vercel env add`).
`NODE_ENV` **não** deve ser definido manualmente — a Vercel define `production` no runtime.

Se um deploy via CLI mostrou `Environments: .env` no build, isso indica que um `.env` local pode ter sido usado. Ações:

1. Confirmar que `.vercelignore` está no repositório
2. Configurar todas as envs de Production na Vercel
3. Redeploy (`pnpm dlx vercel --prod`)
4. Se o `.env` local tinha secrets reais, **rotacionar** senha/JWT/banco conforme necessário

### Configurar envs via CLI (Production)

```bash
pnpm dlx vercel env add DATABASE_URL production
pnpm dlx vercel env add ADMIN_JWT_SECRET production
pnpm dlx vercel env add ADMIN_SESSION_COOKIE production
pnpm dlx vercel env add NEXT_PUBLIC_APP_URL production
pnpm dlx vercel env add NEXT_PUBLIC_STORE_SLUG production
# Bootstrap (seed) — not required on Vercel runtime if you seed from a setup machine:
# MASTER_ADMIN_NAME / MASTER_ADMIN_EMAIL / MASTER_ADMIN_PASSWORD

```

Valores esperados (não commitar):

| Variável | Produção |
| --- | --- |
| `DATABASE_URL` | Neon com `sslmode=require` |
| `ADMIN_JWT_SECRET` | aleatório 32+ chars |
| `ADMIN_SESSION_COOKIE` | `na-brasa-admin-session` |
| `NEXT_PUBLIC_APP_URL` | `https://na-brasa-cardapio.vercel.app` |
| `NEXT_PUBLIC_STORE_SLUG` | `na-brasa` |
| `MASTER_ADMIN_*` | só na máquina/sessão de seed (cria `User` MASTER) |

### Redeploy

```bash
pnpm dlx vercel --prod
```

### Migrations no Neon (local, sem commitar a URL)

PowerShell:

```powershell
$env:DATABASE_URL="COLE_AQUI_A_URL_DO_NEON"
pnpm prisma migrate deploy
# opcional bootstrap controlado:
# pnpm prisma db seed
```

Após seed: validar Store `na-brasa` e trocar WhatsApp placeholder (`5513999999999`) pelo número oficial antes da validação com o cliente.

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
| Login admin falha | Existe `User` ativo no banco? Seed com `MASTER_ADMIN_*`? Senha correta? `ADMIN_JWT_SECRET` definido? |
| Cookie / sessão estranha | HTTPS? `NODE_ENV=production`? `NEXT_PUBLIC_APP_URL` com `https://`? |
| Pedido não aparece no admin | Mesmo `DATABASE_URL` do app? Pedido criou no banco? |
| CI verde, produção quebrada | Envs reais vs fake; URL do app; migrate no remoto |

## O que este guia não cobre

- Domínio customizado DNS
- Deploy automático / Vercel CLI obrigatório
- Docker
- WhatsApp Cloud API / pagamento online / CRUD de cardápio
- Alteração de schema nesta preparação documental
