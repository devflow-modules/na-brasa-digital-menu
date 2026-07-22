# Funnel events instrumentation (issue #103)

Plano mínimo autorizado após product-grill. Parte do epic
[#102 — Evidence, Reliability & InfiniteTap Pilot Cycle](https://github.com/devflow-modules/na-brasa-digital-menu/issues/102).

Relacionado: [../product.md](../product.md) · [pilot-validation-plan.md](pilot-validation-plan.md) ·
skills `.cursor/skills/product-grill` e `.cursor/skills/revenue-centric-design`.

## Status

```text
BUILD (after REDUCE SCOPE)
Classification: PLATFORM
Issue: #103
PR A (schema + recorder): merged
PR B (lifecycle server): shipping
Analytics SaaS / dashboard UI: not authorized
InfiniteTap payment capture: vocabulary only (implement in #110)
```

| Item | Classificação |
| --- | --- |
| Product-grill | **BUILD** (após REDUCE SCOPE) |
| PR A — schema + recorder + purge dry-run | **Feita** |
| PR B — lifecycle server | **Autorizada / em curso** |
| PR C — client Online | **Depois de B** |
| Dashboard / PostHog / Mixpanel | **Fora** |
| Eventos InfiniteTap em runtime | **Fora** (#110) |

---

## Product Decision

### 1. Problema

O piloto opera Online e Balcão em produção, mas as decisões comerciais e de
priorização ainda dependem de impressão qualitativa. Não dá para responder, com
números, onde o funil Online perde pessoas, quanto o Balcão representa do
volume, nem taxas de confirmação/conclusão/cancelamento.

### 2. Evidência

**Fatos**

* produção ativa; aceite do cliente; fluxos Online e Balcão operacionais;
* epic #102 autoriza instrumentação mínima neste ciclo;
* `pilot-validation-plan.md` já descreve um funil conceitual sem telemetria;
* pedidos persistem com `source` (`DIRECT` / `COUNTER`) e `status`.

**Hipótese**

* abandono e mix Online × Balcão são observáveis o suficiente para mudar
  prioridade e sustentar conversa de preço após 14–30 dias.

### 3. Hipótese

Se registrarmos um funil mínimo append-only no Postgres da própria app,
consultável por SQL/script semanal, em 14–30 dias teremos evidência suficiente
— sem construir uma plataforma de analytics.

### 4. Decisão

**REDUCE SCOPE → re-grill → BUILD** · `PLATFORM`

### 5. Responsável / prazo

Product Engineer · observação 14–30 dias após captura completa (#111).

---

## Decisões que os eventos precisam responder

| Decisão | Eventos |
| --- | --- |
| O cardápio está sendo visto? | `menu_viewed` |
| Há intenção de compra (add)? | `product_added` |
| O checkout é alcançado? | `checkout_started` |
| Pedidos estão sendo criados? | `order_created` |
| O handoff WhatsApp foi acionado? | `whatsapp_handoff_started` |
| A loja confirma / conclui / cancela? | `order_confirmed`, `order_completed`, `order_cancelled` |
| Online × Balcão? | `source` (`DIRECT` / `COUNTER`) |
| InfiniteTap no Balcão? | vocabulário `payment_*` (#110) |

`whatsapp_handoff_started` comprova apenas o **acionamento do link** no
navegador — não prova que o app WhatsApp abriu nem que a mensagem foi recebida.

---

## Modelo mínimo (PR A)

### Princípios

1. Append-only; sem update de evento.
2. Server define `occurredAt` sempre.
3. `clientOccurredAt` é auxiliar e não confiável.
4. Sem PII.
5. Sem plataforma genérica de analytics.
6. Unique por loja: `@@unique([storeId, dedupeKey])`.

### Enum fechado (emitidos)

```text
menu_viewed
product_added
checkout_started
order_created
whatsapp_handoff_started
order_confirmed
order_completed
order_cancelled
```

### Vocabulário reservado (não emitir na #103)

```text
payment_started
payment_approved
payment_declined
payment_cancelled
payment_unknown
```

### Identidade anônima

* `sessionId`: UUID no `localStorage` (PR C).
* Eventos de pedido usam `orderId` (PR B).

### Deduplicação

| Evento | `dedupeKey` |
| --- | --- |
| `menu_viewed` | `menu_viewed:{sessionId}:{yyyy-mm-dd}` (UTC) |
| `product_added` | `product_added:{occurrenceId}` — **ocorrência**, nunca só session+product |
| `checkout_started` | `checkout_started:{sessionId}` |
| lifecycle / handoff | `{name}:{orderId}` |

Constraint: `@@unique([storeId, dedupeKey])` — a mesma `dedupeKey` pode existir
em lojas diferentes.

### `occurredAt`

* Sempre definido no servidor no momento do `recordFunnelEvent`.
* Se o client enviar horário, gravar só em `clientOccurredAt`.
* Consultas e retenção usam `occurredAt` do servidor.

### Retenção (90 dias) + purge

* Política: 90 dias (`FUNNEL_EVENT_RETENTION_DAYS`).
* Script: `pnpm data:purge-funnel-events` (dry-run por padrão).
* Apply: `CONFIRM_FUNNEL_EVENT_PURGE=true`.
* Filtros opcionais: `FUNNEL_EVENT_RETENTION_DAYS`, `FUNNEL_EVENT_PURGE_STORE_ID`.
* Não há job automático nesta fatia — execução manual/operacional.

### Armazenamento

Model `FunnelEvent` (Prisma) com allowlist de colunas — sem `Json` livre.

---

## Propriedades permitidas / proibidas

**Permitidas (input do recorder):**  
`storeId`, `name`, `dedupeKey`, `sessionId`, `orderId`, `productId`, `source`,
`quantity`, `clientOccurredAt`

**Proibidas:**  
nome/telefone/e-mail/endereço, `whatsappMessage`, `notes`, IP, userAgent,
password, token, e qualquer chave fora da allowlist.

---

## Escopo por PR

### PR A (esta) — schema + recorder

* Enum `FunnelEventName`
* Model + migration
* `recordFunnelEvent` tolerante a falhas
* Allowlist Zod + helpers de `dedupeKey`
* Testes unitários
* Script de purge dry-run/apply
* Documentação

### Fora da PR A

* componentes client
* emissão no ciclo do pedido
* consultas analíticas semanais
* InfiniteTap / `payment_*`
* dashboard
* qualquer dado pessoal

### PR B — lifecycle server

* `order_created` após persistência `DIRECT` e `COUNTER`
* `order_confirmed` / `order_completed` / `order_cancelled` após transição bem-sucedida
* `order_completed` também via `finalizeCounterOrder` (Balcão)
* dados só do pedido persistido (`storeId`, `orderId`, `source`)
* dedupe `{name}:{orderId}` por loja
* falha de telemetria não altera o fluxo operacional
* sem client, sem WhatsApp handoff, sem consultas, sem InfiniteTap

### PR C

* `menu_viewed`, `product_added`, `checkout_started`, `whatsapp_handoff_started` no client

---

## Critérios de aceite (PR A)

- [x] Enum fechado dos 8 eventos
- [x] `whatsapp_handoff_started` (não `whatsapp_opened`)
- [x] `@@unique([storeId, dedupeKey])`
- [x] `occurredAt` server-side; `clientOccurredAt` auxiliar
- [x] Recorder nunca lança para o caller
- [x] Allowlist explícita; rejeita PII/unknown
- [x] `product_added` dedupe por ocorrência
- [x] Script de retenção dry-run/apply
- [x] Testes de validação, dedupe e isolamento por store
- [x] Sem client / lifecycle / dashboard / InfiniteTap

## Critérios de aceite (PR B)

- [x] `order_created` para DIRECT e COUNTER
- [x] `order_confirmed` / `order_completed` / `order_cancelled` nas transições
- [x] `order_completed` no finalize de Balcão
- [x] propriedades só do pedido persistido
- [x] emissão após sucesso da operação
- [x] dedupe por evento + pedido
- [x] telemetria isolada do fluxo operacional
- [x] testes de serviços/transições
- [x] sem client / WhatsApp / consultas / InfiniteTap

---

## Arquivos (PR A)

* `prisma/schema.prisma`
* `prisma/migrations/20260722010000_add_funnel_events/`
* `src/features/analytics/*` (schema/recorder/retention)
* `scripts/purge-funnel-events.ts`
* `package.json` (`test` + `data:purge-funnel-events`)
* este documento

## Arquivos (PR B)

* `src/features/analytics/record-order-lifecycle-funnel-event.ts` (+ test)
* `src/features/orders/services/create-order.service.ts` (+ test)
* `src/features/orders/services/create-counter-order.service.ts` (+ test)
* `src/features/orders/services/finalize-counter-order.service.ts` (+ test)
* `src/features/admin/orders/admin-order-status.service.ts` (+ test)
* `package.json` (test entry)
* este documento

## Explicitamente fora

PostHog/GA/dashboard · session replay · UTM · InfiniteTap runtime ·
mudança de checkout/preço · ranking via eventos · job automático de purge ·
eventos client · `whatsapp_handoff_started` · consultas semanais
