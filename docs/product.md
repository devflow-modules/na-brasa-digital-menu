# Produto — plataforma white-label de cardápio digital

## Visão

Plataforma **white-label multi-tenant** para pequenos negócios de alimentação: cardápio mobile-first, pedido salvo no banco, encaminhamento ao WhatsApp por link (`wa.me`) e operação em painéis web. **Nome comercial:** indefinido. **Nome interno provisório:** Digital Menu Platform.

Não confundir a plataforma com o **cliente 1**: **Na Braza** (slug `na-brasa`), primeira implantação real em **produção ativa**, com aceite do cliente.

## Problema

**No piloto (Na Braza):** o negócio opera como carrinho de lanche com ponto fixo; o atendimento depende de conversa manual e falta um fluxo digital claro para o cliente montar o pedido e para a equipe acompanhar pedidos.

**Na plataforma:** permitir replicar esse fluxo por **loja (`Store`)**, com isolamento de dados e papéis distintos (cliente final, equipe da loja, operador de plataforma).

## Usuários

| Usuário | Superfície | Objetivo |
| --- | --- | --- |
| Cliente final | Storefront do tenant | Ver cardápio, pedir no celular, enviar via WhatsApp |
| Equipe da loja | `/admin` | Pedidos, cardápio, settings (conforme role) |
| Operador de plataforma | `/master` | Visão agregada e gestão de usuários por loja (`MASTER`) |

## Modelo operacional

- **Tenant:** uma `Store` (slug, WhatsApp, taxas, flags).
- **Pedido:** sempre persistido no server antes do WhatsApp; snapshots em itens.
- **Auth:** `User` no banco; sessão JWT em cookie HttpOnly; RBAC por `UserRole`.
- **Piloto:** uma loja real (Na Braza); storefront público hoje na rota fixa `/na-brasa` (não é rota dinâmica `/{slug}` para qualquer tenant).

## Classificação de requisitos

| Tipo | Significado | Exemplo |
| --- | --- | --- |
| **PLATFORM** | Comportamento transversal (`/master`, auth, regras globais) | Dashboard master |
| **TENANT** | Qualquer loja no modelo `Store` | Settings, pedidos por `storeId` |
| **CLIENT_SPECIFIC** | Só o piloto Na Braza | Copy, scripts `apply-na-braza-*`, rota `/na-brasa` |

Use esta classificação ao priorizar escopo e impacto em isolamento entre lojas. Decisões de arquitetura multi-tenant: [adr/0002-database-backed-multi-admin-and-master-panel.md](adr/0002-database-backed-multi-admin-and-master-panel.md).

## Piloto v0.1.0 — Na Braza

| | |
| --- | --- |
| **Versão** | v0.1.0-pilot |
| **Produção** | https://na-brasa-cardapio.vercel.app/na-brasa |
| **Gate técnico histórico** | Smoke Store Settings: **GO** (jul/2026) |
| **Estágio atual** | Cliente validou; operação em produção ativa |

```text
Pilot accepted by the client
Production operation active
Online and Counter order flows operational
Admin notifications and coordinated live refresh complete
Order queue filters and search complete
Post-validation operational backlog in progress
Continuous feature validation remains required
```

**Em produção no piloto:** fluxo público Online; Balcão; admin (pedidos com filtros/busca e live refresh, cardápio, adicionais, configurações); notificações in-app; `/master` (métricas e usuários por loja); CI/E2E.

**Próximo estágio:**

```text
produção ativa
→ observação operacional
→ backlog priorizado por evidência
→ product-grill por feature
→ implementação controlada
```

**Validação contínua:** o plano em [product/pilot-validation-plan.md](product/pilot-validation-plan.md) permanece como observação pós-deploy, coleta de feedback e critérios para novas evoluções — **não** é mais gate pré-produção. Toda feature relevante continua obrigada a passar por **product-grill** (`.cursor/skills/product-grill`) e, quando couber, **revenue-centric-design**.

Detalhes do release: [releases/v0.1.0-pilot.md](releases/v0.1.0-pilot.md) · dados operacionais: [client/na-braza-pilot-data.md](client/na-braza-pilot-data.md).

## Superfícies atuais

### Storefront público

**Estado atual:** rota do piloto **`/na-brasa`** (e `/na-brasa/checkout`); `/` redireciona para essa rota.

- Renderiza `Store`, categorias e produtos ativos (Server Components + Prisma).
- Carrinho local (`localStorage`); totais no checkout são estimados no client.
- **Pedido mínimo:** aplicado somente a pedidos com entrega (`deliveryType = DELIVERY`), sobre o subtotal de produtos e adicionais (antes da taxa). Pedidos para retirada e pedidos de Balcão não possuem valor mínimo.
- **Direção planejada:** storefront público por slug genérico (não implementado como App Router dinâmico).

### Painel da loja

**Estado atual:** **`/admin`** (login em `/admin/login`), **store-scoped** via `requireAdminStoreContext`.

- Pedidos, cardápio (workspace com accordion/busca; edição sob demanda), adicionais (lista compacta + edição/vínculos sob demanda), configurações — permissões por role no server. Detalhe: [product/menu-management-workspace.md](product/menu-management-workspace.md), [product/addon-management-workspace.md](product/addon-management-workspace.md).
- **Chrome compartilhado** nas rotas autenticadas (`app/admin/(store)`): navegação única filtrada por papel/permissão operacional, logout consistente, identidade da loja; login fora do chrome. Detalhe: [product/admin-navigation-chrome.md](product/admin-navigation-chrome.md).
- Usuários de loja: contexto de `session.storeId`.
- `MASTER` **não** recebe Store piloto implícita em `/admin`; login e acesso direto a `/admin` vão para `/master` até existir seleção explícita de Store.


### Painel master

**Estado atual:** **`/master`** (`requireMasterSession`, role `MASTER`).

- Dashboard com métricas e lista de lojas existentes no banco.
- **Usuários por loja:** `/master/stores/[storeId]/users` (criar, roles de loja, ativar/desativar).
- **Não implementado:** CRUD completo de `Store` (criar/editar/arquivar lojas pela UI).
- Usuários de loja **não** acessam `/master`; operação em `/admin` e `/master` são contextos distintos.

## Fluxo público

```text
Cliente abre /na-brasa
  → carrinho local
  → /na-brasa/checkout
  → pedido salvo (server recalcula preços/taxas; snapshots)
  → abre wa.me com mensagem formatada
```

O payload inclui `storeSlug`; o server resolve a `Store` e valida que produtos/adicionais pertencem a essa loja.

## Fluxo operacional

```text
Equipe: /admin/login → /admin → /admin/pedidos/[id] → atualiza status (server)
Plataforma: /admin/login → /master → gestão de usuários da loja (quando aplicável)
MASTER em /admin sem Store explícita → redirect /master
```


Transições de status e permissões: validadas no server (matrizes abaixo).

## Autenticação e autorização

- Login: `User.email` + `passwordHash` (bcrypt); inativos rejeitados.
- Sessão: JWT (`jose`), cookie `ADMIN_SESSION_COOKIE`, claims `userId`, `role`, `storeId`, etc.
- Bootstrap: `MASTER_ADMIN_NAME`, `MASTER_ADMIN_EMAIL`, `MASTER_ADMIN_PASSWORD` no **seed** (não `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- **`/master`:** só `MASTER`; demais roles → `notFound()`.
- **`/admin`:** roles de loja com `session.storeId` válido; `MASTER` sem contexto explícito → redirect `/master`.


## Modelo multi-tenant

- Dados de catálogo e pedidos vinculados a `Store` / `storeId`.
- Isolamento em queries admin (ex.: pedido `where: { id, storeId }`).
- **Fundação multi-tenant** ≠ **SaaS self-service completo** (sem onboarding automático de novas lojas nem billing).

Schema e seed: [database.md](database.md). Decisão: [adr/0002-database-backed-multi-admin-and-master-panel.md](adr/0002-database-backed-multi-admin-and-master-panel.md).

## Estado atual (detalhes funcionais)

### Dados e pedidos

Resumo do schema: [database.md](database.md). Centavos no server; não confiar em preços do client.

**Comanda digital de balcão:** fluxo técnico completo — criação autenticada (`/admin/balcao`), preparo na fila existente, recebimento e finalização atômica em READY (`paymentMethod` + `paidAt` + `COMPLETED`). Permissões: `orders.create` / `orders.status.complete` para `MASTER`, `STORE_OWNER`, `MANAGER`, `OPERATOR`; `KITCHEN` bloqueado. Bypass genérico para COUNTER unpaid está fechado. E2E Playwright cobre o fluxo ponta a ponta (desktop + mobile) e isolamento/tenant/duplicidade. **Operação Online e Balcão validadas pelo cliente em produção**; fricções pontuais e métricas de uso seguem em [counter-order-operational-validation.md](product/counter-order-operational-validation.md) como observação contínua. Sem caixa, conciliação, fiscal, estoque, impressão ou gateway. Não é PDV completo.

**Pós-criação no Balcão:** após registrar, a confirmação permanece em `/admin/balcao` (sem redirect automático). Draft limpo somente após sucesso; código da comanda visível e ações `Nova comanda` · `Ver pedido` · `Ir para pedidos`. `Ver pedido` permanece até Nova comanda ou o próximo registro. Objetivo: duas comandas consecutivas sem sair da tela. **Counter post-create flow complete · Operator can create consecutive counter orders · Navigation audit backlog in progress.**

**Origem do pedido na fila:** lista e detalhe mostram badge de origem com labels oficiais `DIRECT`→Online, `COUNTER`→Balcão, `IFOOD`→iFood, `OTHER`→Outro (fonte única `formatOrderSource`). Filtros da fila: status, origem e busca por código/nome (`q`) via URL e Prisma server-side (antes de `take: 50`); live refresh preserva a query. A fila mostra **tempo decorrido desde a criação** (`createdAt`, copy neutra “Há …”) com horário absoluto preservado — SSR, sem timer client, sem limiar de urgência/SLA. **Order source visibility complete · Admin order queue filters complete · Status and source filtering implemented · Code and customer-name search implemented · Order elapsed time visible in the admin queue · Absolute order timestamp preserved · Server-rendered elapsed labels · Existing live refresh reused · No urgency threshold or SLA introduced · No client timer or additional polling · Phone search not implemented · Pagination not implemented · Navigation audit backlog in progress.**

**Resumo no topo de `/admin`:** cards store-wide (Pedidos hoje, Pendentes, Receita estimada hoje, Na lista). Expansão do resumo: **DEFER** — cards atuais validados como úteis pelo Store Owner; sem correção de copy nem novos cards neste ciclo ([product/admin-daily-summary-validation.md](product/admin-daily-summary-validation.md)). Limitações técnicas permanecem: “Receita estimada hoje” **não** é caixa/conciliação/faturamento fiscal; DIRECT **não** comprova pagamento; “hoje” usa timezone do servidor (sem timezone persistido por Store); “concluídos/cancelados hoje” como evento de transição **não** são confiáveis sem histórico de status. O fechamento operacional diário é rota dedicada (abaixo) e **não** altera esses cards.

**Fechamento operacional diário (`/admin/relatorios/fechamento`):** relatório dinâmico TENANT para o fim do expediente — totais de pedidos `COMPLETED`, itens, subtotal, taxas, ticket, pagamentos, canais (entrega/retirada/balcão), produtos (snapshots), cancelados separados e alerta de abertos; janela padrão `17:00–01:00` em `America/Sao_Paulo` (editável); pertencimento por `createdAt` na janela; copy + link `wa.me` (sem destinatário/API) e download CSV (UTF-8 BOM, `;`) a partir do mesmo `DailyClosingReport`; UI compacta (empty state único, seções condicionais, ações unificadas, prévia recolhida); permissão `reports.read` só `STORE_OWNER` / `MANAGER`. **Não** é caixa, conciliação nem fiscal. Sem PDF/imutabilidade/Sheets nesta entrega. Detalhe: [product/daily-closing-report.md](product/daily-closing-report.md) · WhatsApp: [product/daily-closing-whatsapp-share.md](product/daily-closing-whatsapp-share.md) · CSV: [product/daily-closing-csv-export.md](product/daily-closing-csv-export.md).

**Navegação administrativa por papel:** chrome compartilhado com fonte única de links (Pedidos / Balcão / Relatórios / Cardápio / Configurações), estado ativo de rota (pathname com trailing slash normalizado), badge PENDING preservado no provider de notificações, logout no chrome. Visibilidade de links ≠ autorização (guards de página inalterados). `KITCHEN` não vê Cardápio/Configurações/Relatórios no chrome; `OPERATOR` não vê Relatórios; acesso direto read-only a outras áreas continua conforme guards. Detalhe: [product/admin-navigation-chrome.md](product/admin-navigation-chrome.md). **Role-aware admin chrome complete · Shared admin navigation complete · Local navigation duplication reduced · Backend authorization unchanged · Navigation audit backlog in progress.**

**Acesso negado explícito (admin):** rotas operacionais com Store context válido e permissão de página negada (ex.: KITCHEN em `/admin/balcao`) renderizam `Acesso não permitido` dentro do chrome, com destino seguro derivado da navegação. `notFound()` permanece para recurso inexistente, pedido de outro tenant, Store context inválido e `/master` sem MASTER. Sessão ausente continua indo para login. **Explicit admin access-denied UX complete · Tenant resource concealment preserved · Session redirect behavior unchanged · Backend authorization unchanged · Navigation audit backlog in progress.**

**Landing MASTER:** login e acesso direto a `/admin` levam a `/master`. Usuários de Store continuam em `/admin` via `session.storeId`. Sem Store picker/switcher e sem fallback piloto implícito. Acesso tenant por MASTER fica para PR futura explícita. **MASTER login landing → /master · Store-user login landing → /admin · MASTER no longer receives implicit pilot Store context · Direct MASTER access to /admin redirects to /master · Tenant Store selection not implemented · Backend authorization unchanged · Navigation audit backlog in progress.**


### Configurações da loja (`/admin/configuracoes`)

- Campos: WhatsApp, endereço, taxa, **pedido mínimo para entrega**, retirada/entrega, `openingHours` (texto informativo; não altera abertura sozinho), `isOpen` (bloqueia Online/`DIRECT`; não impede Balcão/`COUNTER` autorizado).
- O pedido mínimo para entrega pode ser alterado pelo Store Owner nas configurações da loja.
- Pelo menos uma modalidade — entrega ou retirada — deve permanecer habilitada (validação no servidor e aviso na UI).
- O campo de horário continua informativo. A abertura operacional é controlada por “Loja aberta”.
- Reflexo no público **`/na-brasa`**: badge aberto/fechado, taxas e mínimo no checkout/hero (server).
- Loja fechada (`isOpen=false`): bloqueio no server para pedidos Online/`DIRECT` (Balcão permanece operacional para usuários autorizados). Tipo de entrega desabilitado: bloqueio no server em checkout/`createOrder`. Store sem modalidade Online (legado): UI pública de indisponibilidade + rejeição no server.

| Role | Ver | Editar dados estruturais | Abrir/fechar loja |
| --- | --- | --- | --- |
| `MASTER` | sim | sim | sim |
| `STORE_OWNER` / `MANAGER` | sim | sim | sim |
| `OPERATOR` | sim | não | sim |
| `KITCHEN` | sim | não | não |

### Cardápio (`/admin/cardapio`)

- `Product.active` (publicação no cardápio público do piloto) e `Product.available` (indisponível para pedido).

| Role | Ver | Criar/editar | `available` | `active` |
| --- | --- | --- | --- | --- |
| `MASTER` / `STORE_OWNER` / `MANAGER` | sim | sim | sim | sim |
| `OPERATOR` | sim | não | sim | não |
| `KITCHEN` | sim | não | não | não |

### Adicionais (`/admin/cardapio/adicionais`)

Workspace com busca/filtros, linhas compactas, editor e vínculos sob demanda. Validação no server: adicional ativo e vinculado ao produto; preço do banco. Detalhe: [product/addon-management-workspace.md](product/addon-management-workspace.md).

### Status de pedido (`/admin/pedidos/[id]`)

`PENDING` → … → `COMPLETED` / `CANCELLED`; matriz por role (OPERATOR/KITCHEN com restrições). Sem WhatsApp API nem tempo real.

**Notificações de novos pedidos (admin aberto):** foundation soft-auth `pollNewAdminOrdersAction` (cursor `(createdAt, id)`, só `DIRECT`, `orders.read`, `pendingCount` de todos os `PENDING`) + UI in-app: provider no layout `/admin`, polling a cada 8s com pausa em aba oculta, sync ao voltar, banner “Novo pedido online” (`Abrir pedido` / `Dispensar aviso`), badge live de pendentes (todas as origens) navegável para a fila `/admin`, e som opcional (`admin.newOrderSound`, padrão off). O mesmo polling (e sinais de status/COUNTER/aba visível) dispara refresh coordenado da fila SSR via `router.refresh()` (debounce 250ms) — sem segundo poll e sem WebSocket. Bootstrap não reproduz pedidos antigos; `COUNTER` não alerta. Badge permanece no provider (não no chrome de links). **Pending badge navigation complete · Notification copy clarified · Admin order queue live refresh complete · Existing notification polling reused · No duplicate queue polling introduced · Visibility, status and COUNTER refresh coordinated · No WebSocket or SSE · Admin order queue filters complete · Status and source filtering implemented · Code and customer-name search implemented · URL state preserved · Existing live refresh reused · No duplicate polling introduced · Phone search not implemented · Pagination not implemented · Admin product roadmap in progress · Navigation audit backlog in progress.** Sem Web Push, SSE, WebSocket ou migration. Sem filtros salvos por usuário, busca por telefone, paginação ou histórico persistente de eventos do pedido. Múltiplas abas podem tocar o mesmo alerta.

| Role | Ver | Confirmar | Preparar / pronto | Despachar / concluir | Cancelar |
| --- | --- | --- | --- | --- | --- |
| `MASTER` | sim (transicional) | sim | sim | sim | sim |
| `STORE_OWNER` / `MANAGER` | sim | sim | sim | sim | sim |
| `OPERATOR` | sim | sim | sim | sim | não |
| `KITCHEN` | sim | não | sim | não | não |

## Fora do piloto (ainda não prometido)

Não prometer ao cliente Na Braza sem decisão de produto e **product-grill**:

- Pagamento online, WhatsApp Business API
- Reset de senha, upload de imagens, relatórios avançados (PDF/Sheets/histórico imutável/BI; CSV do fechamento já entregue), Web Push / tempo real push
- Zonas de entrega, horário por dia da semana estruturado
- CRUD de lojas no `/master`
- Storefront dinâmico por slug para novos tenants
- PDV completo, caixa, fiscal, impressão, conciliação

## Roadmap (pós-validação)

- Observação operacional contínua e backlog priorizado por evidência (fricções reais da loja)
- Observação de 7–14 dias dos filtros da fila (uso efetivo, legenda “Na lista”, limites do `take: 50`)
- Observação de 7–14 dias do tempo decorrido na fila (ajuda a priorizar? confusão com “atraso”?)
- Histórico de status do pedido: experimento **VALIDATE** — [product/order-history-validation.md](product/order-history-validation.md) (sem schema/timeline até evidência + novo grill)
- Checkout idempotency → **VALIDATE** → observe DIRECT duplicate candidates for 14 days → no migration or contract change authorized — [product/checkout-idempotency-validation.md](product/checkout-idempotency-validation.md)
- Pilot Production Readiness → **IN PROGRESS** → **GO COM CONDIÇÕES** → reliability, recovery, security and operational controls — [product/pilot-production-readiness.md](product/pilot-production-readiness.md) · admin recovery runbook: [admin-access-recovery.md](admin-access-recovery.md)
- Admin daily summary expansion → **DEFER** → current cards validated as operationally useful → no copy correction required → reopen only with a concrete operational gap — [product/admin-daily-summary-validation.md](product/admin-daily-summary-validation.md)
- Daily closing operational report → **BUILD** → dedicated `/admin/relatorios/fechamento` + WhatsApp copy; does not expand `/admin` summary cards — [product/daily-closing-report.md](product/daily-closing-report.md)
- Daily closing CSV export → **BUILD** → download from the same `DailyClosingReport` DTO; no Sheets/XLSX — [product/daily-closing-csv-export.md](product/daily-closing-csv-export.md)
- Daily closing WhatsApp share → **BUILD** → improved message + `wa.me` link without destination/API — [product/daily-closing-whatsapp-share.md](product/daily-closing-whatsapp-share.md)
- Hipóteses pontuais de UX/notificações/Balcão sob observação — ver planos em `docs/product/`
- Storefront por slug e onboarding de tenants (quando evidência e grill autorizarem)
- CRUD de `Store` no master, billing, polish de marca white-label (fora do ciclo imediato do piloto)
- Itens em [README.md](../README.md) e ADRs

Toda feature relevante continua obrigada a passar por **product-grill** antes do
planejamento técnico — o aceite geral do piloto **não** dispensa o grill.
Somente **BUILD** autoriza arquitetura.
`REDUCE SCOPE` exige reformular e executar o grill novamente.
Registrar a decisão em `## Product Decision` (plano da feature e corpo da PR).

## Referências

- [product/pilot-validation-plan.md](product/pilot-validation-plan.md)
- [product/order-history-validation.md](product/order-history-validation.md)
- [product/checkout-idempotency-validation.md](product/checkout-idempotency-validation.md)
- [product/pilot-production-readiness.md](product/pilot-production-readiness.md)
- [product/admin-daily-summary-validation.md](product/admin-daily-summary-validation.md)
- [product/daily-closing-report.md](product/daily-closing-report.md)
- [product/daily-closing-csv-export.md](product/daily-closing-csv-export.md)
- [product/daily-closing-whatsapp-share.md](product/daily-closing-whatsapp-share.md)
- [product/menu-management-workspace.md](product/menu-management-workspace.md)
- [product/addon-management-workspace.md](product/addon-management-workspace.md)
- [product/payment-methods-debit-credit.md](product/payment-methods-debit-credit.md)
- [database.md](database.md) · [deployment.md](deployment.md) · [operations.md](operations.md) · [testing.md](testing.md)
- [adr/0002-database-backed-multi-admin-and-master-panel.md](adr/0002-database-backed-multi-admin-and-master-panel.md)
- [adr/0003-ui-ux-direction-for-pilot.md](adr/0003-ui-ux-direction-for-pilot.md) (UX **específica do piloto** Na Braza)
