# Admin daily summary validation

Experimento de produto para a candidata **Resumo operacional diário mínimo**.
Não autoriza novos cards, queries, dashboard, migration ou alteração de copy neste ciclo.

Relacionado: [../product.md](../product.md) · skill `.cursor/skills/product-grill`.

## Status

```text
DEFER
Classification: TENANT
Summary expansion: not authorized
Copy correction: not required
```

| Item | Classificação |
| --- | --- |
| Product-grill (proposta ampla + financeira) | **REDUCE SCOPE** → re-grill |
| Product-grill (expansão operacional) | **VALIDATE** → observação |
| Decisão após evidência do Store Owner | **DEFER** |
| Implementação / novas queries | **Não autorizado** |

## Problem

Avaliar se o resumo atual em `/admin` era insuficiente para o turno ou se a copy financeira (“Receita estimada hoje”) causava interpretação incorreta — e se valia expandir cards (Online/Balcão, status, valores, ontem).

## Hypothesis

Um resumo diário maior (ou correção de copy) melhoraria a visão do turno ou corrigiria confusão semântica.

## Evidence currently available (pre-observation)

**Fatos técnicos:**

* cards store-wide já existem: Pedidos hoje, Pendentes, Receita estimada hoje, Na lista;
* “Pedidos hoje” usa `createdAt` desde o início do dia no **timezone do servidor** (não há timezone persistido por Store);
* “Receita estimada hoje” soma `totalCents` de pedidos criados hoje com `status ≠ CANCELLED` — **não** é caixa, conciliação, faturamento fiscal nem comprovante de pagamento;
* DIRECT concluído **não** comprova pagamento recebido;
* COUNTER com `paidAt` é fluxo distinto e não transforma o card em caixa;
* sem histórico de status, “concluídos hoje” / “cancelados hoje” como **evento no dia** não são confiáveis (`updatedAt` ≠ timestamp da etapa);
* filtros da fila não devem alterar as métricas gerais (exceto “Na lista”).

## Evidence collected

* The current summary cards help the Store Owner understand the operation.
* The current "Receita estimada hoje" label is understood as an estimate and is not being interpreted as reconciled revenue, cash received, or fiscal revenue.
* No concrete need for additional cards or breakdowns was identified.

Não há evidência registrada de:

* necessidade de mais cards;
* necessidade de Online versus Balcão no resumo;
* necessidade de status adicionais no topo;
* dificuldade para entender o turno;
* decisão operacional bloqueada pelo resumo atual;
* pedido por dashboard ou análise histórica.

## Decision after observation

```text
DEFER
```

## Decision rationale

The current summary already provides sufficient operational value. Adding more cards or queries without a concrete operational gap would increase interface density and maintenance cost without validated benefit.

Copy correction is not required: the Store Owner understands "Receita estimada hoje" as an estimate, not cash or reconciled revenue.

## Technical limitations (still valid)

Mesmo sem confusão atual do cliente, a documentação e o produto devem continuar honestos:

* “Receita estimada hoje” **não** é caixa, conciliação, faturamento oficial nem valor fiscal;
* pedido DIRECT (mesmo `COMPLETED`) **não** comprova pagamento recebido;
* “hoje” depende do timezone do servidor até existir timezone de Store;
* “concluídos hoje” / “cancelados hoje” como momento da transição **não** são confiáveis sem histórico de status (experimento em [order-history-validation.md](order-history-validation.md)).

## Reopening conditions

Reopen the product-grill only if one or more of these conditions occur:

- Store Owner explicitly requests an Online versus Balcão breakdown;
- a concrete operational decision is blocked by a missing count;
- the current cards become confusing;
- users begin interpreting the estimated value as cash or reconciled revenue;
- a reliable financial or order-history model is introduced;
- repeated requests for status snapshots are documented.

## Product Decision

```md
## Product Decision

- Problem: Avaliar se o resumo atual era insuficiente ou se sua copy financeira causava interpretação incorreta.
- Evidence: O Store Owner confirmou que os cards atuais ajudam na operação e que a copy não induz interpretação incorreta. Nenhum gap operacional adicional foi relatado.
- Hypothesis: Um resumo maior poderia melhorar a visão do turno ou corrigir confusão semântica.
- Expected behavior: Manter o resumo atual sem expansão.
- Primary metric: Store Owner consegue compreender o estado da operação com os cards existentes.
- Guardrail metrics: Não apresentar estimativa como caixa ou receita conciliada; não adicionar métricas sem confiabilidade; não poluir a fila.
- Classification: TENANT
- Decision: DEFER
- Rationale: O resumo atual já resolve a necessidade observada. Não existe evidência para novos cards, novas queries ou alteração de copy.
- Smallest experiment or implementation: Nenhuma implementação. Manter o comportamento atual.
- Validation owner: Product Engineer + Store Owner
- Observation window: Validação concluída
- Evidence that would change the decision: Pedido explícito por breakdown, confusão futura, decisão operacional bloqueada ou evolução do modelo de pagamentos/histórico.
```

## Reduced proposal (only if reopened)

Se as condições de reabertura forem atendidas, o próximo grill deve partir de contagens **operacionais precisas** no modelo atual — sem dashboard financeiro, sem “concluídos hoje” baseado em `updatedAt`, sem migration de agregação. Não planejar arquitetura até novo **BUILD**.
