# Production checklist — Na Brasa Digital Menu

Checklist **GO / NO-GO** para o primeiro deploy real controlado.

Guias: [deployment.md](deployment.md) · [operations.md](operations.md) · [release notes](release-notes/mvp-v0.1.0.md) · [testing.md](testing.md)

Use dados **fictícios** no smoke (nome/telefone de teste). Não use PII real de clientes em validação.

---

## 1. Pré-deploy

- [ ] PRs relevantes mergeadas em `main`
- [ ] `main` atualizado localmente / remoto
- [ ] GitHub Actions verdes na `main`:
  - [ ] Quality Checks
  - [ ] E2E Tests
- [ ] Banco remoto criado (Neon recomendado ou Supabase Postgres)
- [ ] Envs configuradas na Vercel (Production) — ver [deployment.md](deployment.md)
- [ ] Envs **não** dependem de upload do `.env` local (usar painel / `vercel env add`)
- [ ] `.vercelignore` presente no repo (bloqueia `.env` / `*.env` no CLI)
- [ ] Seed/cardápio revisado (fictício ajustado **ou** plano de cadastro real)
- [ ] WhatsApp da loja **confirmado** (número oficial, não placeholder)
- [ ] Credenciais de sessão: `ADMIN_JWT_SECRET` forte + `ADMIN_SESSION_COOKIE`
- [ ] Usuário admin no banco: seed com `MASTER_ADMIN_NAME` / `MASTER_ADMIN_EMAIL` / `MASTER_ADMIN_PASSWORD` (ou User criado manualmente)
- [ ] `ADMIN_EMAIL` / `ADMIN_PASSWORD` **não** são mais necessários no runtime (podem ser removidos da Vercel após cutover)
- [ ] `NEXT_PUBLIC_APP_URL` planejado (URL Vercel HTTPS)
- [ ] `NEXT_PUBLIC_STORE_SLUG=na-brasa` (ou slug acordado)

## 2. Deploy

- [ ] Projeto criado na Vercel
- [ ] Repositório GitHub conectado
- [ ] Environment Variables de Production preenchidas
- [ ] Install/build padrão Next.js (sem customização obrigatória)
- [ ] Deploy a partir de `main` concluído sem erro
- [ ] URL `*.vercel.app` anotada
- [ ] `NEXT_PUBLIC_APP_URL` alinhado à URL real (redeploy se mudou após o 1º deploy)

## 3. Banco

- [ ] `DATABASE_URL` da Vercel aponta ao banco remoto (não localhost; com SSL se exigido)
- [ ] `pnpm prisma migrate deploy` executado contra o remoto
- [ ] Seed/bootstrap controlado **somente se aplicável** (`pnpm prisma db seed`) — seed **não** sobrescreve Store/cardápio já existentes; só cria ausentes
- [ ] Store `na-brasa` existe no banco
- [ ] WhatsApp da loja validado no registro da Store (não `5513999999999` placeholder)
- [ ] Cardápio ativo coerente com o que o dono espera mostrar
- [ ] (Se `MASTER_ADMIN_*` usados) usuário `MASTER` existe no banco; senha **não** aparece em logs

## 4. Smoke test produção

- [ ] Abrir `/na-brasa` (mobile)
- [ ] Adicionar produto ao carrinho
- [ ] Ir para `/na-brasa/checkout`
- [ ] Criar **pedido teste** (cliente fictício)
- [ ] Confirmar abertura do WhatsApp (`wa.me`) com mensagem coerente
- [ ] Confirmar pedido no banco (`PENDING`, totais > 0)
- [ ] Acessar `/admin/login`
- [ ] Login com credenciais do `User` no banco (`MASTER` ou usuário de loja)
- [ ] Ver pedido no dashboard `/admin`
- [ ] Abrir `/admin/pedidos/[id]`
- [ ] Mudar status (ex.: Pendente → Confirmado)
- [ ] Concluir **ou** cancelar o pedido teste (com role que permita cancelar: OWNER/MANAGER/MASTER)
- [ ] (opcional) Com usuário `OPERATOR`: confirmar que **não** vê cancelar
- [ ] (opcional) Com usuário `KITCHEN`: ver só preparar/pronto nos status adequados
- [ ] (MASTER) Abrir `/master` — ver loja `na-brasa` e cards de resumo
- [ ] (MASTER) Abrir **Gerenciar usuários** da loja — listar/criar usuário de loja
- [ ] (usuário de loja) Confirmar que `/master` **não** abre
- [ ] (usuário de loja com `storeId`) `/admin` só mostra pedidos da própria Store
- [ ] (opcional) `/admin/cardapio` — listar; OPERATOR só `available`; KITCHEN só leitura; `active` oculta do público
- [ ] (usuário inativo) login rejeitado
Se qualquer item falhar → **NO-GO**.

## 5. Segurança

- [ ] Nenhum segredo real no repositório / PRs / screenshots
- [ ] `.env` local não é a fonte das envs de produção (Vercel env vars)
- [ ] Cookie admin HttpOnly (não há token em `localStorage`)
- [ ] Login via `User` no banco (não `ADMIN_EMAIL`/`ADMIN_PASSWORD` runtime)
- [ ] `ADMIN_JWT_SECRET` longo e aleatório
- [ ] Senha do usuário admin forte (apenas hash no banco)
- [ ] Banco remoto sem exposição pública desnecessária
- [ ] Consciência de PII nos pedidos (nome, telefone, endereço)
- [ ] Testes automatizados / CI não usam dados reais de clientes
- [ ] E2E CI usa Postgres efêmero, **não** o banco de produção

## 6. Rollback manual

Se precisar voltar atrás após o deploy:

- [ ] Reverter / promover deployment anterior estável na Vercel
- [ ] **Não** rodar migration destrutiva / reset no banco
- [ ] Preservar o banco (histórico de pedidos)
- [ ] Se necessário, desativar/ocultar o link público temporariamente

Detalhes: [deployment.md](deployment.md#rollback-manual-básico).

## 7. Pós-validação com o dono

- [ ] Testar no celular do operador
- [ ] Testar abertura do link (WhatsApp / Instagram bio, se for o caso)
- [ ] Confirmar texto da mensagem WhatsApp
- [ ] Confirmar preços no cardápio
- [ ] Confirmar taxa de entrega / pedido mínimo (se aplicável)
- [ ] Confirmar horários / aberto-fechado
- [ ] Confirmar operação do painel (login, lista, status)

## Resultado

| Resultado | Critério |
| --- | --- |
| **GO** | Pré-deploy + deploy + banco + smoke + segurança OK; dono validou o essencial |
| **NO-GO** | Qualquer falha de env, migrate, WhatsApp, login, pedido ou status — corrigir antes de divulgar |

**Decisão:** _______________ (GO / NO-GO)  
**Data:** _______________  
**Quem validou:** _______________
