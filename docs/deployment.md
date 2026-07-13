# Deploy — Na Brasa Digital Menu

Guia para colocar o MVP em produção e validar o fluxo real com o cliente.

Documentos relacionados: [README](../README.md) · [Operação](operations.md) · [Produto](product.md) · [Banco](database.md) · [Release notes](release-notes/mvp-v0.1.0.md)

## Arquitetura recomendada

```text
Cliente (mobile)  →  Vercel (Next.js 15)
                         │
                         ├── Prisma → PostgreSQL gerenciado (Neon ou Supabase)
                         └── Server Actions (pedido + admin)
                                    │
                                    └── wa.me (link WhatsApp; sem Cloud API)
```

| Camada | Serviço sugerido |
| --- | --- |
| App (Next.js) | **Vercel** |
| Banco | **Neon** ou **Supabase Postgres** (PostgreSQL) |
| Domínio | Domínio customizado na Vercel (opcional no primeiro deploy) |

Não é necessário Docker, monorepo ou backend Express separado para este MVP.

## 1. Banco de dados (Neon / Supabase)

1. Crie um projeto PostgreSQL no provedor escolhido.
2. Copie a connection string (idealmente com SSL habilitado).
3. Defina no ambiente da Vercel (e localmente, se for testar contra o remoto):

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
```

Ajuste host, porta e parâmetros conforme o provedor. O Prisma usa `DATABASE_URL` em `prisma/schema.prisma`.

## 2. Variáveis de ambiente na Vercel

Configure no projeto Vercel → Settings → Environment Variables (Production):

| Variável | Obrigatória | Notas |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Connection string do Postgres remoto |
| `ADMIN_EMAIL` | Sim | E-mail do operador |
| `ADMIN_PASSWORD` | Sim | Senha forte (mín. 8 no schema; use bem mais forte em produção) |
| `ADMIN_JWT_SECRET` | Sim | Segredo longo e aleatório (mín. 16; preferir 32+ chars) |
| `ADMIN_SESSION_COOKIE` | Sim | Ex.: `na-brasa-admin-session` |
| `NEXT_PUBLIC_APP_URL` | Sim | URL HTTPS pública (ex.: `https://seu-app.vercel.app`) |
| `NEXT_PUBLIC_STORE_SLUG` | Sim | `na-brasa` (ou o slug da loja no banco) |
| `NODE_ENV` | Automático | A Vercel define `production` no runtime; cookie admin usa `Secure` |

Referência de placeholders (sem segredos reais): [`.env.example`](../.env.example).

### Segurança das envs

- Nunca commitar `.env` com valores reais
- Não logar `ADMIN_PASSWORD` ou `ADMIN_JWT_SECRET`
- Rotacionar senha/JWT se houver vazamento
- Pedidos no banco contêm PII — restringir acesso ao painel e ao banco

## 3. Migrations

Com `DATABASE_URL` apontando para o banco de produção (ou via Vercel CLI / máquina com a env):

```bash
pnpm prisma generate
pnpm prisma migrate deploy
```

- **Dev:** `pnpm prisma migrate dev`
- **Prod:** `pnpm prisma migrate deploy` (aplica migrations já versionadas; não cria novas)

Não altere o schema nesta preparação de deploy — apenas aplique o que já existe no repositório.

## 4. Seed (bootstrap controlado)

```bash
pnpm prisma db seed
```

O seed (`prisma/seed.ts`) é **idempotente** e cria:

- Loja `na-brasa`
- Categorias, produtos e adicionais **fictícios**
- WhatsApp placeholder: `5513999999999` (não é número real)

**Importante em produção:**

- Se o seed usar dados fictícios, ajuste antes do uso real **ou** execute apenas como bootstrap controlado e depois atualize a loja (WhatsApp, endereço, taxas, cardápio) com dados oficiais.
- Não deixe o placeholder do WhatsApp em produção se o cliente for receber pedidos reais.
- Alternativa: aplicar só as migrations e cadastrar a loja manualmente (Prisma Studio / SQL) sem seed.

## 5. Deploy do app na Vercel

1. Conecte o repositório GitHub à Vercel.
2. Framework: Next.js (detecção automática).
3. Configure as envs da seção 2.
4. Deploy (branch `main` ou a branch acordada).
5. Confirme `NEXT_PUBLIC_APP_URL` com a URL real gerada (ou domínio customizado).

Comandos locais equivalentes ao build de produção:

```bash
pnpm build
pnpm start
```

## Checklist antes do deploy

- [ ] `DATABASE_URL` remoto criado e testado
- [ ] Envs admin definidas (`ADMIN_EMAIL`, `ADMIN_PASSWORD` forte, `ADMIN_JWT_SECRET` forte)
- [ ] `ADMIN_SESSION_COOKIE` definido
- [ ] `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_STORE_SLUG` corretos
- [ ] `pnpm lint` / `pnpm typecheck` / `pnpm build` passam localmente
- [ ] Plano para migrations + seed/loja real documentado
- [ ] Número WhatsApp da loja conhecido para configurar no banco

## Checklist depois do deploy

- [ ] Migrations aplicadas no banco remoto
- [ ] Loja existe com WhatsApp real (seed ajustado ou cadastro manual)
- [ ] Build/deploy Vercel concluído sem erro
- [ ] `/na-brasa` carrega no domínio de produção
- [ ] Cookie admin `Secure` ativo (tráfego HTTPS)

## Smoke test em produção

1. Abrir `/na-brasa` no celular — cardápio carrega
2. Adicionar itens ao carrinho e ir ao checkout
3. Finalizar pedido teste — `Order` criado no banco
4. Confirmar que `wa.me` abre com mensagem coerente
5. Abrir `/admin/login` — autenticar
6. Em `/admin`, ver o pedido teste na lista
7. Abrir `/admin/pedidos/[id]` — detalhe correto
8. Avançar status (ex.: Pendente → Confirmado) — UI e banco atualizam
9. Logout funciona; rota `/admin` sem sessão redireciona para login

Se algum passo falhar: **NO-GO** até corrigir (envs, migrations, WhatsApp da loja ou auth).

## O que este guia não cobre

- CI/CD avançado
- Docker deploy
- CRUD de cardápio / upload de imagens
- WhatsApp Cloud API / pagamento online
- Alteração de schema Prisma nesta PR de documentação
