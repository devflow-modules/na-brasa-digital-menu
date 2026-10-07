# Pilot Production Readiness

Epic de confiabilidade, recuperação, segurança operacional e controles de processo para o piloto **Na Braza**.

Fonte de verdade para classificar o piloto como:

```text
funcionalmente completo
e
operacionalmente protegido
```

Inventário baseado **exclusivamente** na auditoria C (repositório + GitHub API). Controles de painel (Neon, Vercel, org GitHub) permanecem até confirmação humana.

Relacionado: [../product.md](../product.md) · [../deployment.md](../deployment.md) · [../production-checklist.md](../production-checklist.md) · [../admin-access-recovery.md](../admin-access-recovery.md) · [checkout-idempotency-validation.md](checkout-idempotency-validation.md) · [order-history-validation.md](order-history-validation.md)

---

## Status

```text
Status: IN PROGRESS
Classification: PLATFORM
Decision: BUILD INCREMENTALLY
Pilot status: GO WITH CONDITIONS
```

| Item | Classificação |
| --- | --- |
| Núcleo comercial e operacional (Online + Admin + Balcão) | **Apto ao piloto** |
| P0 funcional conhecido | **Nenhum** |
| Confiabilidade / recuperação / abuso / proteção de `main` | **Lacunas P1** |
| Implementações deste epic | **Não autorizadas automaticamente** |
| Fatias que alteram produto ou arquitetura | **Workflow adequado** (`product-grill` → BUILD) |
| Configuração GitHub / Neon / Vercel | **Controles operacionais** (podem ocorrer sem virar feature) |

Este epic **não** autoriza features comerciais (pagamento, caixa, BI, WhatsApp API, etc.).

Não afirmar que o sistema está “100% sem bugs”.

---

## 1. Resumo executivo

```text
O piloto Na Braza está funcionalmente apto para operação.
Ainda não está plenamente protegido contra falhas de produção,
perda de dados, abuso, regressões e perda de acesso administrativo.
```

**Veredito:**

```text
GO COM CONDIÇÕES
```

O restante do trabalho é **confiabilidade, segurança operacional e recuperação** — não falta de recurso essencial de venda.

---

## 2. Inventário dos controles existentes

| Área | Estado | Evidência | Lacuna | Próxima ação |
| ---- | ------ | --------- | ------ | ------------ |
| CI workflows | EXISTS — ADEQUATE | Quality inclui `pnpm test` (PPR-07); E2E com Postgres efêmero; triggers PR + push `main`; concurrency | — | PPR-07 done |
| Branch protection | EXISTS — ADEQUATE | Ruleset `Protect main` (id 19223806): PR obrigatório; checks `Lint, typecheck and build` + `Playwright E2E`; non-fast-forward; push direto bloqueado | — | PPR-08 done |
| Secret scanning e Dependabot | EXISTS — ADEQUATE | Secret scanning + push protection + Dependabot security updates enabled; `.github/dependabot.yml` (npm + github-actions semanal) | Validity checks / non-provider patterns ainda disabled (opcional) | PPR-09 done |
| Observabilidade | PARTIAL (confirmado) | Hobby: Runtime Logs até ~2 weeks; health + Actions OK; Alert Rules/Drains indisponíveis; `MONITORING_WEBHOOK_URL` ausente — [uptime-and-alerts.md](../operations/uptime-and-alerts.md) | Sem alerta push nativo; sem drain; sem APM | PPR-02 decisão: VALIDATE webhook; DEFER Sentry/Pro |
| Backup e PITR | DONE | Neon Free; history window **6h**; drill PITR 2026-10-06 (`SELECT 1` + branch removida); [database-backup-and-restore.md](../operations/database-backup-and-restore.md) | — | PPR-04 / PPR-05 |
| Recuperação administrativa | EXISTS — ADEQUATE (docs) | Runbook [admin-access-recovery.md](../admin-access-recovery.md); script Owner; MASTER users UI; bcrypt; rotação JWT; inativo bloqueia novo login | Reset self-service no painel continua roadmap; sessão JWT pré-existente até 8h sem recheck de `isActive` | PPR-06 done |
| Rate limiting | PARTIAL | PPR-10 BUILD: login + `createOrder` in-memory por IP (#107) | Sem limiter distribuído; polling Admin / catálogo fora de escopo | PPR-11 |
| Deploy, smoke e rollback | EXISTS — ADEQUATE | Deploy Vercel; migrations; seed controlado; checklist; smoke; rollback de app; scripts operacionais | Rollback de **dados** não coberto | PPR-04 / PPR-05 |
| Health e uptime | PARTIAL | `#108` health + workflow `Production Uptime` + runbook | Monitor dedicado / SLA comercial ainda DEFER | PPR-12 |
| Runbook de incidentes | EXISTS — INCOMPLETE | Troubleshooting parcial (`deployment.md`); rollback básico | Sem matriz consolidada incidente → mitigação → responsável → comunicação | PPR-13 |

### Estados usados no inventário

```text
EXISTS — ADEQUATE
EXISTS — INCOMPLETE
MISSING
MISSING OR DISABLED
EXTERNAL CONFIRMATION REQUIRED
```

---

## 3. Priorização

### P0

```text
Nenhum conhecido
```

### P1

#### P1.1 Observabilidade

| | |
| --- | --- |
| Objetivo | Detectar falhas; alertar rapidamente; evitar PII; identificar Store, rota e tipo de erro |
| Estado | PPR-01 DONE — classificação **PARTIAL**; PPR-02 decisão registrada (VALIDATE / DEFER) |
| Dependência externa | Confirmada 2026-10-06 — ver [uptime-and-alerts.md § PPR-01](../operations/uptime-and-alerts.md#confirmação-vercel-ppr-01--2026-10-06) |
| Gate | Product-grill de error tracking **concluído** abaixo (sem BUILD de APM neste ciclo) |

#### P1.2 Backup / PITR / restore

| | |
| --- | --- |
| Estado | DONE |
| Ações | Provedor Neon Free; PITR 6h; drill 2026-10-06 documentado |
| IDs | PPR-04, PPR-05 |

#### P1.3 Recuperação administrativa

| | |
| --- | --- |
| Estado | READY FOR DOCUMENTATION |
| Nota | Pode começar como runbook **sem código** |
| ID | PPR-06 |

#### P1.4 CI e proteção da `main`

| | |
| --- | --- |
| Estado | READY FOR PROCESS CONFIGURATION |
| Separar | (a) `pnpm test` no Quality; (b) branch protection + required checks; (c) política de push direto; (d) secret scanning; (e) Dependabot |
| IDs | PPR-07, PPR-08, PPR-09 |

#### P1.5 Rate limiting

| | |
| --- | --- |
| Estado | PPR-10 BUILD autorizado; PPR-11 em implementação (#107) |
| Nota | Escopo mínimo: admin login + Online `createOrder`; in-memory por IP |
| Risco | Sem abuso documentado; limites conservadores para não bloquear piloto |

---

## 4. Fase 2 (P2)

| Item | Nota |
| --- | --- |
| Timezone do piloto | Constante `America/Sao_Paulo` possível em PR pequena; não é seletor multi-tenant |
| Health check | Endpoint técnico opcional sem dados sensíveis |
| Uptime monitor | Monitor externo `/na-brasa` e `/admin/login` |
| Runbook de incidentes | Consolidar matriz (PPR-13) |
| Smoke pós-deploy | Automatizar ou ritualizar após merges |
| Performance mobile | Revisão periódica |
| Acessibilidade operacional | Revisão periódica |

---

## 5. Itens guiados por evidência (fora do BUILD deste epic)

| Item | Decisão | Documento | Nota |
| --- | --- | --- | --- |
| Idempotência checkout Online | BUILD (#105) | [checkout-idempotency-validation.md](checkout-idempotency-validation.md) | Deploy com migration + `ORDER_IDEMPOTENCY_SECRET` |
| Histórico de status | VALIDATE | [order-history-validation.md](order-history-validation.md) | Sem implementação autorizada |
| Expansão do resumo Admin | DEFER | [admin-daily-summary-validation.md](admin-daily-summary-validation.md) | Reabrir só com gap operacional concreto |

### Features comerciais — não incluir neste epic

* pagamento online;
* caixa completo;
* BI / relatórios avançados;
* WhatsApp Cloud API;
* fidelidade;
* zonas de entrega;
* PDV fiscal.

---

## 6. External confirmation checklist

Preencher **somente** com evidência humana no painel. Status permitidos:

```text
CONFIRMED
NOT CONFIRMED
UNAVAILABLE ON PLAN
NOT APPLICABLE
```

| Controle | Status | Evidência | Responsável | Data |
| -------- | ------ | --------- | ----------- | ---- |
| Provedor real do banco | CONFIRMED | Neon Free (`sa-east-1`, host `*.aws.neon.tech`) | Platform owner | 2026-10-06 |
| PITR habilitado | CONFIRMED | History window ativa (Settings → Postgres) | Platform owner | 2026-10-06 |
| Retenção do PITR | CONFIRMED | **6 hours** (máx. Free neste projeto; upgrade até 30 days) | Platform owner | 2026-10-06 |
| Restore testado | CONFIRMED | Branch temporária PITR + `SELECT 1` + delete — [database-backup-and-restore.md](../operations/database-backup-and-restore.md) | Platform owner | 2026-10-06 |
| Resultado do restore | CONFIRMED | `restore-drill-20261006T220115`; validação ok; produção intacta | Platform owner | 2026-10-06 |
| Vercel Runtime Logs | CONFIRMED | Hobby — aba Logs ativa; filtros/busca/Live; tráfego real observado. Classificação geral PPR-01: **PARTIAL** | Platform owner | 2026-10-06 |
| Retenção dos logs (Vercel) | CONFIRMED | Seletor Timeline até **Last 2 weeks** (não é arquivo de longo prazo) | Platform owner | 2026-10-06 |
| Alertas da Vercel | UNAVAILABLE ON PLAN | Settings → Alerts: Add Rule / Add Webhook desabilitados no Hobby | Platform owner | 2026-10-06 |
| Log Drain | UNAVAILABLE ON PLAN | Settings → Drains: Add Drain desabilitado (Upgrade to Pro) | Platform owner | 2026-10-06 |
| Monitoramento Neon | NOT CONFIRMED | | | |
| Alertas Neon | NOT CONFIRMED | | | |
| Admins GitHub | NOT CONFIRMED | | | |
| Admins Vercel | NOT CONFIRMED | | | |
| Admins Neon | NOT CONFIRMED | | | |
| Rulesets da organização | NOT CONFIRMED | | | |
| Secret scanning da organização | NOT CONFIRMED | | | |

Não marcar como `CONFIRMED` sem evidência humana.

---

## 7. Critérios de conclusão do epic

O epic só pode ser marcado como concluído quando:

* [~] error tracking ou cobertura equivalente estiver operacional — **DEFER** SDK; cobertura parcial = Runtime Logs + ops-log (#108); fechar gap de alerta via VALIDATE webhook;
* [ ] alertas críticos estiverem configurados — nativos Vercel **UNAVAILABLE ON PLAN**; falta configurar `MONITORING_WEBHOOK_URL` (VALIDATE);
* [x] PITR estiver confirmado ou alternativa formalmente aceita;
* [x] restore tiver sido testado;
* [x] recuperação de acesso estiver documentada;
* [x] `main` estiver protegida;
* [x] unit tests rodarem no CI;
* [x] secret scanning estiver habilitado ou risco formalmente aceito;
* [~] rate limiting — decisão **BUILD** (PPR-10); implementação mínima login/`createOrder` (PPR-11 / #107);
* [ ] runbook de incidentes existir;
* [x] uptime estiver monitorado — health + Production Uptime Actions (PPR-12; monitor dedicado DEFER);
* [ ] smoke recente estiver verde.

### Critério de classificação final

Somente após os itens acima:

```text
Pilot status:
FUNCTIONALLY COMPLETE
OPERATIONALLY PROTECTED
```

Até lá, permanece:

```text
GO WITH CONDITIONS
```

---

## 8. Backlog do epic

Tipos: `EXTERNAL` · `DOCUMENTATION` · `CONFIGURATION` · `PRODUCT-GRILL` · `BUILD` · `VALIDATION`

| ID | Item | Prioridade | Tipo | Estado | Dependência | Evidência de conclusão |
| -- | ---- | ---------- | ---- | ------ | ----------- | ---------------------- |
| PPR-01 | Confirm Vercel logging and alerts | P1 | EXTERNAL | DONE | — | **PARTIAL** (2026-10-06): Logs OK (~2w); Alerts/Drains Hobby indisponíveis; webhook app ausente — [uptime-and-alerts.md](../operations/uptime-and-alerts.md) |
| PPR-02 | Plan production error tracking | P1 | PRODUCT-GRILL | DONE | PPR-01 | Decisão: **VALIDATE** `MONITORING_WEBHOOK_URL` + **DEFER** Sentry/APM/Pro drains (ver § abaixo) |
| PPR-03 | Configure error tracking | P1 | BUILD | DEFER | PPR-02 ≠ BUILD | Sem SDK de error tracking neste ciclo; reabrir se VALIDATE webhook falhar ou incidente passar despercebido |
| PPR-04 | Confirm database provider and PITR | P1 | EXTERNAL | DONE | — | Neon Free + history window 6h confirmados no Console (2026-10-06) |
| PPR-05 | Execute restore drill | P1 | VALIDATION | DONE | PPR-04 | 2026-10-06: branch `restore-drill-20261006T220115` from ~60m ago; `SELECT 1` ok; branch deleted; produção intacta |
| PPR-06 | Document admin recovery runbook | P1 | DOCUMENTATION | DONE | — | [admin-access-recovery.md](../admin-access-recovery.md) |
| PPR-07 | Add unit tests to Quality workflow | P1 | CONFIGURATION | DONE | — | `pnpm test` no `quality.yml`; CI verde (PR #73) |
| PPR-08 | Protect main branch | P1 | CONFIGURATION | DONE | — | Ruleset `Protect main`; required checks Quality + E2E; push direto bloqueado |
| PPR-09 | Enable secret scanning and Dependabot | P1 | CONFIGURATION | DONE | — | Secret scanning + push protection + Dependabot security updates + `dependabot.yml` |
| PPR-10 | Plan rate limiting | P1 | PRODUCT-GRILL | DONE | PPR-01 | **BUILD** — login + `createOrder` in-memory por IP; DEFER Redis/polling (ver § PPR-10) |
| PPR-11 | Implement approved rate limiting | P1 | BUILD | IN PROGRESS | PPR-10 = BUILD | `#107` — limites documentados em uptime-and-alerts |
| PPR-12 | Add health and uptime monitoring | P2 | BUILD / CONFIGURATION | DONE (#108) | — | Health + Actions + webhook opcional; monitor dedicado ainda DEFER |
| PPR-13 | Consolidate incident runbook | P2 | DOCUMENTATION | NOT STARTED | Útil após PPR-06 | Matriz incidente → mitigação → responsável → comunicação |
| PPR-14 | Re-run production smoke | P1 | VALIDATION | NOT STARTED | Após fatias relevantes | Smoke checklist verde documentado |

---

## 9. Ordem recomendada

```text
PPR-04 Confirm database provider and PITR
+
PPR-08 Protect main branch
+
PPR-07 Add unit tests to Quality
+
PPR-09 Enable repository security controls
→ podem ocorrer imediatamente (painel / config / PR pequena de workflow)

PPR-01 Confirm Vercel logging and alerts
→ define escopo real da observabilidade

PPR-02 Product-grill observability
→ somente após confirmação externa (PPR-01)

PPR-06 Admin recovery runbook
→ pode ocorrer em paralelo (só documentação)

PPR-10 Rate limiting product-grill
→ após observabilidade ou em paralelo conforme risco
```

**Observabilidade:** PPR-01 **DONE** (**PARTIAL**). PPR-02 decisão abaixo. Próximo no plano: configurar webhook (VALIDATE) → PPR-10 rate limit grill → PPR-14 smoke → PPR-13 runbook.

---

## Product Decision — PPR-10 (rate limiting)

- **Problem:** Login admin e criação de pedido online aceitam tráfego ilimitado; risco de brute-force / flood sem incidente documentado ainda.
- **Evidence:** Issue #107; inventário MISSING; já existe padrão in-memory em funnel ingest; PPR-01/02 fecharam observabilidade parcial.
- **Who:** Clientes no checkout Online; operadores no `/admin/login`.
- **Expected behavior:** Pico abusivo recebe mensagem genérica e não cria sessão/pedido; uso normal do piloto não é bloqueado.
- **Classification:** PLATFORM (integridade / abuso).
- **Decision:** **BUILD** escopo mínimo — `loginAdminAction` (10/15 min/IP) + `createOrderAction` (20/min/IP), in-memory; **DEFER** Redis, polling Admin, catálogo, balcão.
- **Rationale:** Menor proteção server-side reutilizando padrão já validado no funnel; sem infra nova.
- **Primary metric:** Zero bloqueios falsos em operação normal do piloto; tentativas de login em massa param com mensagem segura.
- **Guardrails:** Sem PII nos logs do limiter; mensagem não vaza se a conta existe; sem middleware global.
- **Next step:** Implementar PPR-11 (#107) e observar na janela comercial (#111).

---

## Product Decision — PPR-02 (error tracking)

- **Problem:** No Hobby, falhas de checkout/Admin podem passar sem alerta push (Alert Rules/Drains indisponíveis; `MONITORING_WEBHOOK_URL` ausente).
- **Evidence:** PPR-01 2026-10-06 — Runtime Logs OK (~2 weeks); Alerts/Drains blocked; Production Uptime verde; health 200; webhook env ausente.
- **Who:** Platform owner / operador do piloto.
- **Expected behavior:** Erro crítico inesperado gera sinal acionável (Slack/Discord) sem PII; triage detalhada nos Runtime Logs / ops-log.
- **Classification:** PLATFORM.
- **Decision:** **VALIDATE** configurar `MONITORING_WEBHOOK_URL` em Production + redeploy se necessário; **DEFER** Sentry/APM, upgrade Pro, Log Drains e Alert Rules nativas.
- **Rationale:** Menor mudança que fecha o gap de alerta no plano atual; APM/Pro é custo/complexidade sem incidente perdido documentado.
- **Primary metric:** Tempo até o owner perceber falha crítica (meta piloto: &lt; 15 min via webhook ou falha do Actions).
- **Guardrails:** Sem PII no payload do webhook; sem SDK de error tracking neste ciclo; sem upgrade de plano sem decisão explícita.
- **Next step:** Owner cria Incoming Webhook (Slack/Discord) → cola em Vercel env `MONITORING_WEBHOOK_URL` (Production) → redeploy → opcional smoke de `logOpsCriticalError` só em preview/staging.
- **Reopen PPR-03 (BUILD)** se: webhook inviável, ou incidente crítico passar despercebido na janela #111, ou retenção de 2 weeks for insuficiente na prática.

---

## Product Decision (epic)

- **Problem:** O piloto opera em produção com núcleo funcional completo, mas sem cobertura suficiente de detecção de falhas, recuperação de dados, proteção de `main`, recuperação de acesso e mitigação de abuso.
- **Evidence:** Inventário atualizado — vários controles P1 já DONE (CI, main, Dependabot, PITR/restore, admin recovery, health/uptime); observabilidade **PARTIAL**; rate limiting ainda MISSING.
- **Expected behavior:** Controles P1 fechados de forma incremental; fatias de produto/arquitetura passam por grill; configs de painel documentadas no checklist externo; classificação final só com critérios da seção 7.
- **Classification:** PLATFORM.
- **Decision:** BUILD INCREMENTALLY.
- **Rationale:** GO COM CONDIÇÕES — risco operacional real sem P0 de produto; evitar feature comercial e overengineering; evidência → decisão → implementação por fatia.
- **Primary metric:** Tempo para detectar e mitigar falha de checkout/Admin; capacidade de restore; merges só com checks verdes.
- **Guardrails:** Sem PII em logs/alertas; sem analytics complexo sem decisão; sem pagamento/caixa/BI neste epic; VALIDATE (idempotência, histórico) intactos.
- **First increment:** Paralelo imediato — PPR-04 (Neon), PPR-07/08/09 (CI/proteção/segurança repo), PPR-06 (runbook); observabilidade só após PPR-01.
- **External dependencies:** Painéis Neon, Vercel, GitHub (admins, PITR, logs, alertas, rulesets org).
- **Completion criteria:** Seção 7 + classificação `FUNCTIONALLY COMPLETE` / `OPERATIONALLY PROTECTED`.

---

## Tipos de ação (guia)

| Tipo | Exemplos | Precisa product-grill? |
| --- | --- | --- |
| EXTERNAL | Confirmar PITR, alertas Vercel | Não (checklist) |
| DOCUMENTATION | Runbooks | Não (revisão de docs) |
| CONFIGURATION | Branch protection, Dependabot, step `pnpm test` | Não como feature; PR pequena se tocar repo |
| PRODUCT-GRILL | Error tracking produto, rate limiting | **Sim** |
| BUILD | Implementação aprovada pelo grill | Sim (após BUILD) |
| VALIDATION | Restore drill, smoke | Não |

---

## Decision after increments

```text
Pending — epic IN PROGRESS
```
