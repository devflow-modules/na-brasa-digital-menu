# Produto — plataforma white-label de cardápio digital

## Visão

Plataforma **white-label multi-tenant** para pequenos negócios de alimentação: cardápio mobile-first, pedido salvo no banco, encaminhamento ao WhatsApp por link (`wa.me`) e operação em painéis web. **Nome comercial:** indefinido. **Nome interno provisório:** Digital Menu Platform.

Não confundir a plataforma com o **cliente 1**: **Na Braza** (slug `na-brasa`), primeira implantação real em produção controlada.

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
| **Gate** | Smoke Store Settings: **GO** (jul/2026) |

**Pronto no piloto:** fluxo público completo; admin (pedidos, cardápio, adicionais, configurações); `/master` (métricas e usuários por loja); CI/E2E.

**Próximos passos:** aceite do dono → dados reais finais → divulgação do link → backlog com o Na Braza (sem feature nova até aceite).

**Validação do piloto:** plano formal em [product/pilot-validation-plan.md](product/pilot-validation-plan.md). Gates de decisão no Cursor: `.cursor/skills/product-grill` e `.cursor/skills/revenue-centric-design`.

Detalhes: [releases/v0.1.0-pilot.md](releases/v0.1.0-pilot.md) · dados operacionais: [client/na-braza-pilot-data.md](client/na-braza-pilot-data.md).

## Superfícies atuais

### Storefront público

**Estado atual:** rota do piloto **`/na-brasa`** (e `/na-brasa/checkout`); `/` redireciona para essa rota.

- Renderiza `Store`, categorias e produtos ativos (Server Components + Prisma).
- Carrinho local (`localStorage`); totais no checkout são estimados no client.
- **Direção planejada:** storefront público por slug genérico (não implementado como App Router dinâmico).

### Painel da loja

**Estado atual:** **`/admin`** (login em `/admin/login`), **store-scoped** via `requireAdminStoreContext`.

- Pedidos, cardápio, adicionais, configurações — permissões por role no server.
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

**Comanda digital de balcão:** fluxo técnico completo — criação autenticada (`/admin/balcao`), preparo na fila existente, recebimento e finalização atômica em READY (`paymentMethod` + `paidAt` + `COMPLETED`). Permissões: `orders.create` / `orders.status.complete` para `MASTER`, `STORE_OWNER`, `MANAGER`, `OPERATOR`; `KITCHEN` bloqueado. Bypass genérico para COUNTER unpaid está fechado. E2E Playwright cobre o fluxo ponta a ponta (desktop + mobile) e isolamento/tenant/duplicidade; validação operacional em loja ainda pendente — ver [counter-order-operational-validation.md](product/counter-order-operational-validation.md). Sem caixa, conciliação, fiscal, estoque, impressão ou gateway. Não é PDV completo.

**Pós-criação no Balcão:** após registrar, a confirmação permanece em `/admin/balcao` (sem redirect automático). Draft limpo somente após sucesso; código da comanda visível e ações `Nova comanda` · `Ver pedido` · `Ir para pedidos`. `Ver pedido` permanece até Nova comanda ou o próximo registro. Objetivo: duas comandas consecutivas sem sair da tela. **Counter post-create flow complete · Operator can create consecutive counter orders · Navigation audit backlog in progress.**

**Origem do pedido na fila:** lista e detalhe mostram badge de origem com labels oficiais `DIRECT`→Online, `COUNTER`→Balcão, `IFOOD`→iFood, `OTHER`→Outro (fonte única `formatOrderSource`). Objetivo: o operador distinguir online vs balcão sem abrir o detalhe. **Order source visibility complete · Filtering by source not implemented · Navigation audit backlog in progress.**

**Navegação administrativa por papel:** chrome compartilhado com fonte única de links (Pedidos / Balcão / Cardápio / Configurações), estado ativo de rota (pathname com trailing slash normalizado), badge PENDING preservado no provider de notificações, logout no chrome. Visibilidade de links ≠ autorização (guards de página inalterados). `KITCHEN` não vê Cardápio/Configurações no chrome; acesso direto read-only continua permitido e mutações seguem bloqueadas no server. Detalhe: [product/admin-navigation-chrome.md](product/admin-navigation-chrome.md). **Role-aware admin chrome complete · Shared admin navigation complete · Local navigation duplication reduced · Backend authorization unchanged · Navigation audit backlog in progress.**

**Acesso negado explícito (admin):** rotas operacionais com Store context válido e permissão de página negada (ex.: KITCHEN em `/admin/balcao`) renderizam `Acesso não permitido` dentro do chrome, com destino seguro derivado da navegação. `notFound()` permanece para recurso inexistente, pedido de outro tenant, Store context inválido e `/master` sem MASTER. Sessão ausente continua indo para login. **Explicit admin access-denied UX complete · Tenant resource concealment preserved · Session redirect behavior unchanged · Backend authorization unchanged · Navigation audit backlog in progress.**

**Landing MASTER:** login e acesso direto a `/admin` levam a `/master`. Usuários de Store continuam em `/admin` via `session.storeId`. Sem Store picker/switcher e sem fallback piloto implícito. Acesso tenant por MASTER fica para PR futura explícita. **MASTER login landing → /master · Store-user login landing → /admin · MASTER no longer receives implicit pilot Store context · Direct MASTER access to /admin redirects to /master · Tenant Store selection not implemented · Backend authorization unchanged · Navigation audit backlog in progress.**


### Configurações da loja (`/admin/configuracoes`)

- Campos: WhatsApp, endereço, taxa, retirada/entrega, `openingHours`, `isOpen`.
- Reflexo no público **`/na-brasa`**: badge aberto/fechado, taxas no checkout (server).
- Loja fechada ou tipo de entrega desabilitado: bloqueio no server em checkout/`createOrder`.

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

Validação no server: adicional ativo e vinculado ao produto; preço do banco.

### Status de pedido (`/admin/pedidos/[id]`)

`PENDING` → … → `COMPLETED` / `CANCELLED`; matriz por role (OPERATOR/KITCHEN com restrições). Sem WhatsApp API nem tempo real.

**Notificações de novos pedidos (admin aberto):** foundation soft-auth `pollNewAdminOrdersAction` (cursor `(createdAt, id)`, só `DIRECT`, `orders.read`, `pendingCount` de todos os `PENDING`) + UI in-app: provider no layout `/admin`, polling a cada 8s com pausa em aba oculta, sync ao voltar, banner “Novo pedido online” (`Abrir pedido` / `Dispensar aviso`), badge live de pendentes (todas as origens) navegável para a fila `/admin`, e som opcional (`admin.newOrderSound`, padrão off). O mesmo polling (e sinais de status/COUNTER/aba visível) dispara refresh coordenado da fila SSR via `router.refresh()` (debounce 250ms) — sem segundo poll e sem WebSocket. Bootstrap não reproduz pedidos antigos; `COUNTER` não alerta. Badge permanece no provider (não no chrome de links). **Pending badge navigation complete · Notification copy clarified · Admin order queue live refresh complete · Existing notification polling reused · No duplicate queue polling introduced · Visibility, status and COUNTER refresh coordinated · No WebSocket or SSE · Admin product roadmap in progress · Navigation audit backlog in progress.** Sem Web Push, SSE, WebSocket, migration, filtro ou histórico persistente. Múltiplas abas podem tocar o mesmo alerta.

| Role | Ver | Confirmar | Preparar / pronto | Despachar / concluir | Cancelar |
| --- | --- | --- | --- | --- | --- |
| `MASTER` | sim (transicional) | sim | sim | sim | sim |
| `STORE_OWNER` / `MANAGER` | sim | sim | sim | sim | sim |
| `OPERATOR` | sim | sim | sim | sim | não |
| `KITCHEN` | sim | não | sim | não | não |

## Fora do piloto

Não prometer ao cliente Na Braza sem decisão de produto:

- Pagamento online, WhatsApp Business API
- Reset de senha, upload de imagens, relatórios, tempo real
- Zonas de entrega, horário por dia da semana estruturado
- CRUD de lojas no `/master`
- Storefront dinâmico por slug para novos tenants
- PDV completo, caixa, fiscal, impressão; validação operacional do balcão em loja real ainda pendente

## Roadmap

- Validação operacional da comanda de balcão ([product/counter-order-operational-validation.md](product/counter-order-operational-validation.md))
- Validação controlada do piloto ([product/pilot-validation-plan.md](product/pilot-validation-plan.md))
- Aceite e dados reais do piloto Na Braza
- Storefront por slug e onboarding de tenants
- CRUD de `Store` no master, billing, polish de marca white-label
- Itens em [README.md](../README.md) e ADRs

Toda feature relevante após o aceite deve passar por **product-grill** antes do
planejamento técnico. Somente **BUILD** autoriza arquitetura.
`REDUCE SCOPE` exige reformular e executar o grill novamente.
Registrar a decisão em `## Product Decision` (plano da feature e corpo da PR).

## Referências

- [product/pilot-validation-plan.md](product/pilot-validation-plan.md)
- [database.md](database.md) · [deployment.md](deployment.md) · [operations.md](operations.md) · [testing.md](testing.md)
- [adr/0002-database-backed-multi-admin-and-master-panel.md](adr/0002-database-backed-multi-admin-and-master-panel.md)
- [adr/0003-ui-ux-direction-for-pilot.md](adr/0003-ui-ux-direction-for-pilot.md) (UX **específica do piloto** Na Braza)
