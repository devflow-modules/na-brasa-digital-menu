# Checklist de produção — piloto Na Braza

Checklist **GO / NO-GO** para deploy em produção da plataforma com foco no **piloto do cliente 1 (Na Braza**, slug `na-brasa`).

Guias: [deployment.md](deployment.md) · [operations.md](operations.md) · [releases/v0.1.0-pilot.md](releases/v0.1.0-pilot.md) · [testing.md](testing.md) · Dados reais do piloto Na Braza: [client/na-braza-pilot-data.md](client/na-braza-pilot-data.md)

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
- [ ] Checkout DIRECT: `ORDER_IDEMPOTENCY_SECRET` (mín. 16; único por ambiente) + migration de idempotência aplicada
- [ ] Observabilidade (#108): `MONITORING_WEBHOOK_URL` opcional (Slack/Discord Incoming Webhook) + redeploy; validar `/api/health` e workflow `Production Uptime`
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
- [ ] (opcional) `/admin/cardapio/adicionais` — CRUD/vínculos (MANAGER+); OPERATOR/KITCHEN só leitura
- [ ] (opcional) `/admin/configuracoes` — MANAGER edita taxa/endereço; OPERATOR só abrir/fechar; loja aberta após smoke
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
- [ ] Confirmar taxa de entrega / pedido mínimo **para entrega** em `/admin/configuracoes` (se aplicável; retirada e Balcão sem mínimo; pelo menos uma modalidade habilitada)
- [ ] Confirmar horários / aberto-fechado
- [ ] Confirmar operação do painel (login, lista, status)

## Client acceptance checklist

**Aceite geral do cliente:** concluído — o piloto está em produção ativa com
uso real (Online + Balcão). Este checklist deixa de ser gate de entrada e
passa a servir para **revalidação** após mudanças grandes de dados ou campanha.

- [x] Dados da loja conferidos em `/admin/configuracoes` — aceite geral
- [x] WhatsApp oficial conferido (mensagem de teste chega no número certo) — aceite geral
- [x] Endereço conferido no público — aceite geral
- [x] Horário / texto de funcionamento conferido — aceite geral
- [x] Taxa de entrega conferida — aceite geral
- [x] Entrega e retirada habilitadas conforme operação — aceite geral
- [x] Cardápio e categorias conferidos — aceite geral
- [x] Preços conferidos — aceite geral
- [x] Adicionais conferidos (vínculos e preços) — aceite geral
- [x] Pedido teste enviado para o WhatsApp oficial — aceite geral
- [x] Pedido aparece no `/admin` — aceite geral
- [x] Status do pedido atualizado no fluxo real — aceite geral
- [ ] Link público aprovado (`/na-brasa`) — reconfirmar se houver restrição de divulgação
- [ ] QR Code ou link pronto para divulgação (Instagram, balcão, etc.) — observação / campanha

## Pilot smoke checklist

Resumo dos fluxos já validados em produção (jul/2026). Repetir após mudanças grandes ou antes de campanha:

- [ ] `/na-brasa` carrega; produto disponível entra no carrinho
- [ ] Checkout cria pedido e abre `wa.me`
- [ ] `/admin` lista o pedido; status avança conforme role
- [ ] `/admin/configuracoes`: MANAGER edita endereço/taxa/horário; público reflete
- [ ] Loja fechada (`isOpen=false`) bloqueia checkout Online e criação de pedido `DIRECT` (incluindo acesso direto à URL); Balcão autorizado não depende de `isOpen`
- [ ] Entrega desligada bloqueia pedido delivery (server)
- [ ] Retirada desligada bloqueia pedido pickup (server)
- [ ] OPERATOR só abre/fecha; KITCHEN só leitura
- [ ] Valores reais da loja restaurados após qualquer teste

Referência: [releases/v0.1.0-pilot.md](releases/v0.1.0-pilot.md#validated-production-smoke).

## Na Braza — após `pnpm store:apply-na-braza-settings`

Rodar o script manual em produção só após merge desta PR e com `DATABASE_URL` de produção. Depois conferir no público `/na-brasa`:

- [ ] Nome da loja exibe **Na Braza**
- [ ] WhatsApp do pedido aponta para **5513981091971** (smoke com número de teste; não spamar o número real)
- [ ] Endereço e horário conferidos no hero
- [ ] Taxa de entrega exibe **R$ 6,00** (quando entrega habilitada)
- [ ] Pedido mínimo para entrega exibe **R$ 30,00** quando a entrega está habilitada
- [ ] Retirada e entrega habilitadas conforme piloto

Fonte dos valores: [client/na-braza-pilot-data.md](client/na-braza-pilot-data.md).

## Na Braza — após `pnpm menu:apply-na-braza-pilot`

Rodar após merge do cardápio piloto e com `DATABASE_URL` de produção. Conferir em `/na-brasa`:

- [ ] Categorias na ordem: Lanches artesanais → Espetinhos na Brasa → Bebidas → Cervejas
- [ ] **Pão Carne Queijo** exibe **R$ 25,00**
- [ ] Adicionais do burger: Bacon/Salada/Hambúrguer independentes; grupo “Escolha o queijo extra” (Cheddar / Prato, máx. 1); Queijo extra legado inativo
- [ ] Espetinhos (carne, linguiça, coração, misto) visíveis
- [ ] Bebidas listadas conforme piloto
- [ ] Cervejas com texto **Produto permitido apenas para maiores de 18 anos.**
- [ ] Itens fictícios antigos (ex.: Burger Na Braza) **não** aparecem no público
- [ ] Pedido teste com Pão Carne Queijo + adicional ≥ R$ 30,00 finaliza e abre WhatsApp correto

## Na Braza — após `pnpm store:create-na-braza-owner`

Rodar com `DATABASE_URL` de produção e `NA_BRAZA_LUCAS_PASSWORD` (mín. 12 caracteres). Conferir com o e-mail real do Lucas:

- [ ] Login em `/admin/login` com `theluksvm@gmail.com`
- [ ] Acesso a `/admin` (dashboard de pedidos)
- [ ] Acesso a `/admin/cardapio`
- [ ] Acesso a `/admin/configuracoes`
- [ ] `/master` **bloqueado** para STORE_OWNER
- [ ] Logout funciona (sessão encerrada)

## Na Braza — após `pnpm data:clean-na-braza-tests` (apply)

Rodar dry-run antes; apply só com `CONFIRM_CLEAN_NA_BRAZA_TEST_DATA=true` e `DATABASE_URL` de produção.

- [ ] Pedidos de smoke/E2E aparecem como **cancelados** no admin (não pendentes na fila)
- [ ] Fila `/admin` sem pedidos de teste aguardando ação
- [ ] `/na-brasa` exibe somente itens do cardápio piloto real
- [ ] Lucas (`theluksvm@gmail.com`) continua **ativo** e consegue login
- [ ] `/master` continua **bloqueado** para STORE_OWNER

## Na Braza — após `pnpm data:purge-na-braza-tests` (apply)

Rodar dry-run antes; apply só com `CONFIRM_PURGE_NA_BRAZA_TEST_RECORDS=true` e `DATABASE_URL` de produção. Executar **depois** da limpeza (`data:clean-na-braza-tests`) quando quiser painel sem registros técnicos.

- [ ] `/admin` sem pedidos Smoke/E2E (nem cancelados)
- [ ] `/admin/cardapio` sem produtos E2E/técnicos
- [ ] Select de categoria sem categorias E2E
- [ ] `/na-brasa` só com cardápio piloto real
- [ ] Lucas (`theluksvm@gmail.com`) login OK
- [ ] `/master` bloqueado para STORE_OWNER

## Resultado

| Resultado | Critério |
| --- | --- |
| **GO** | Pré-deploy + deploy + banco + smoke + segurança OK; dono validou o essencial |
| **NO-GO** | Qualquer falha de env, migrate, WhatsApp, login, pedido ou status — corrigir antes de divulgar |

**Decisão:** _______________ (GO / NO-GO)  
**Data:** _______________  
**Quem validou:** _______________
