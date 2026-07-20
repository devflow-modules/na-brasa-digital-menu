# Pilot Production Readiness

Epic de confiabilidade, recuperação, segurança operacional e controles de processo para o piloto **Na Braza**.

Fonte de verdade para classificar o piloto como:

```text
funcionalmente completo
e
operacionalmente protegido
```

Inventário baseado **exclusivamente** na auditoria C (repositório + GitHub API). Controles de painel (Neon, Vercel, org GitHub) permanecem até confirmação humana.

Relacionado: [../product.md](../product.md) · [../deployment.md](../deployment.md) · [../production-checklist.md](../production-checklist.md) · [checkout-idempotency-validation.md](checkout-idempotency-validation.md) · [order-history-validation.md](order-history-validation.md)

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
| CI workflows | EXISTS — ADEQUATE | `.github/workflows/quality.yml` e `e2e.yml`; triggers `pull_request` + `push` em `main`; concurrency com cancel-in-progress; runs recentes verdes; E2E com Postgres efêmero; artefatos em falha; CI não usa produção | Units no Quality: ver PPR-07 | PPR-07 |
| Branch protection | IN PROGRESS | Ruleset / proteção de `main` em configuração neste ciclo (PPR-08); required checks Quality + E2E | Confirmar após apply da API | PPR-08 |
| Secret scanning e Dependabot | IN PROGRESS | Habilitação via API + `.github/dependabot.yml` neste ciclo (PPR-09) | Confirmar status no GitHub após apply | PPR-09 |
| Observabilidade | MISSING | Cobertura parcial: `console.error` em catches; Vercel Runtime Logs possivelmente disponíveis (externo) | Sem error tracking, correlação, dashboard, retenção documentada, alertas, uptime, política de logs, APM | PPR-01 → PPR-02 → PPR-03 |
| Backup e PITR | EXTERNAL CONFIRMATION REQUIRED | Rollback de aplicação documentado; preservação do banco e migrations seguras em docs | Provedor real, PITR, retenção, restore testado e responsável não confirmados | PPR-04 → PPR-05 |
| Recuperação administrativa | EXISTS — INCOMPLETE | Script criar Owner; MASTER cria/desativa usuários; bcrypt; JWT rotacionável por secret; usuário inativo não autentica | Sem runbook único, fluxo de reset, validação de identidade, substituição de Owner, registro da intervenção, checklist de rotação JWT | PPR-06 |
| Rate limiting | MISSING | Nenhuma dependência/código/docs de rate limit | Login, `createOrder`, polling Admin (e catálogo público se aplicável) sem limite; sem incidente de abuso documentado | PPR-10 → PPR-11 |
| Deploy, smoke e rollback | EXISTS — ADEQUATE | Deploy Vercel; migrations; seed controlado; checklist; smoke; rollback de app; scripts operacionais | Rollback de **dados** não coberto | PPR-04 / PPR-05 |
| Health e uptime | MISSING | Sem `/health`; sem monitor externo documentado; sem alerta de indisponibilidade | Detecção tardia de outage | PPR-12 (Fase 2) |
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
| Estado | READY FOR PRODUCT-GRILL |
| Dependência externa | Confirmar recursos do plano Vercel (logs, alertas, Log Drain) — PPR-01 |
| Gate | **Não** abrir `product-grill` de implementação até PPR-01 |

#### P1.2 Backup / PITR / restore

| | |
| --- | --- |
| Estado | BLOCKED BY EXTERNAL CONFIRMATION |
| Ações | Confirmar provedor; PITR; retenção; testar restore; documentar resultado; definir responsável |
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
| Estado | READY FOR PRODUCT-GRILL |
| Nota | Implementar só após decisão arquitetural (PPR-10 → PPR-11) |
| Risco | Sem abuso documentado; priorizar após observabilidade ou em paralelo se o risco for aceito |

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
| Idempotência checkout Online | VALIDATE | [checkout-idempotency-validation.md](checkout-idempotency-validation.md) | 14 dias; sem implementação autorizada |
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
| Provedor real do banco | NOT CONFIRMED | | | |
| PITR habilitado | NOT CONFIRMED | | | |
| Retenção do PITR | NOT CONFIRMED | | | |
| Restore testado | NOT CONFIRMED | | | |
| Resultado do restore | NOT CONFIRMED | | | |
| Vercel Runtime Logs | NOT CONFIRMED | | | |
| Retenção dos logs (Vercel) | NOT CONFIRMED | | | |
| Alertas da Vercel | NOT CONFIRMED | | | |
| Log Drain | NOT CONFIRMED | | | |
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

* [ ] error tracking ou cobertura equivalente estiver operacional;
* [ ] alertas críticos estiverem configurados;
* [ ] PITR estiver confirmado ou alternativa formalmente aceita;
* [ ] restore tiver sido testado;
* [ ] recuperação de acesso estiver documentada;
* [ ] `main` estiver protegida;
* [ ] unit tests rodarem no CI;
* [ ] secret scanning estiver habilitado ou risco formalmente aceito;
* [ ] rate limiting estiver implementado ou decisão formal estiver registrada;
* [ ] runbook de incidentes existir;
* [ ] uptime estiver monitorado;
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
| PPR-01 | Confirm Vercel logging and alerts | P1 | EXTERNAL | NOT STARTED | — | Checklist externo preenchido (logs, retenção, alertas, Log Drain) |
| PPR-02 | Plan production error tracking | P1 | PRODUCT-GRILL | BLOCKED | PPR-01 | Product Decision BUILD (ou DEFER/VALIDATE) |
| PPR-03 | Configure error tracking | P1 | BUILD | BLOCKED | PPR-02 = BUILD | Erros de checkout/Admin capturados sem PII + alerta |
| PPR-04 | Confirm database provider and PITR | P1 | EXTERNAL | NOT CONFIRMED | — | Provedor + PITR + retenção no checklist (painel humano; não bloqueia PPR-07/08/09) |
| PPR-05 | Execute restore drill | P1 | VALIDATION | BLOCKED | PPR-04 | Restore em branch/DB temporário documentado |
| PPR-06 | Document admin recovery runbook | P1 | DOCUMENTATION | NOT STARTED | — | Runbook com reset, Owner, JWT, desativação, registro |
| PPR-07 | Add unit tests to Quality workflow | P1 | CONFIGURATION | IN PROGRESS | — | `pnpm test` no `quality.yml`; CI verde |
| PPR-08 | Protect main branch | P1 | CONFIGURATION | IN PROGRESS | — | Branch protection + required checks (Quality + E2E); push direto bloqueado via PR obrigatório |
| PPR-09 | Enable secret scanning and Dependabot | P1 | CONFIGURATION | IN PROGRESS | — | Controles habilitados **ou** risco formalmente aceito |
| PPR-10 | Plan rate limiting | P1 | PRODUCT-GRILL | NOT STARTED | Preferível após PPR-01/02 | Product Decision |
| PPR-11 | Implement approved rate limiting | P1 | BUILD | BLOCKED | PPR-10 = BUILD | Limites em login/`createOrder` (escopo aprovado) |
| PPR-12 | Add health and uptime monitoring | P2 | BUILD / CONFIGURATION | NOT STARTED | — | Monitor externo + alerta de indisponibilidade |
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

**Observabilidade** entra em `product-grill` **somente** depois de confirmar o que a Vercel já oferece no plano atual.

---

## Product Decision

- **Problem:** O piloto opera em produção com núcleo funcional completo, mas sem cobertura suficiente de detecção de falhas, recuperação de dados, proteção de `main`, recuperação de acesso e mitigação de abuso.
- **Evidence:** Auditoria C — CI workflows adequados (units fora do Quality); branch protection ausente; secret scanning/Dependabot desabilitados; observabilidade ausente (só `console.error`); PITR/restore não confirmados; recuperação admin incompleta; rate limiting ausente; deploy/smoke/rollback de app adequados.
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
