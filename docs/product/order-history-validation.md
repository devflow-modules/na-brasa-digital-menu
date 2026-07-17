# Order history validation

Experimento de produto para a candidata **Histórico de status e ações do pedido**.
Não autoriza implementação, schema, migration ou timeline na UI.

Relacionado: [../product.md](../product.md) · skill `.cursor/skills/product-grill`.

## Status

```text
VALIDATE
Classification: TENANT
Persistence / timeline: not authorized
```

| Item | Classificação |
| --- | --- |
| Product-grill da proposta ampla | **VALIDATE** |
| Schema / migration / OrderEvent | **Não autorizado** |
| Proposta reduzida (abaixo) | **Somente se evidência positiva → novo grill** |
| Decisão pós-observação | **Pending** |

## Problem

O admin persiste o **estado atual** do pedido, mas não responde com confiança:

* quem alterou o status;
* quando a alteração ocorreu;
* quem cancelou ou concluiu;
* em qual momento o pedido entrou em cada etapa.

Isso pode dificultar suporte, investigação e aprendizado operacional — **se** essas perguntas surgirem na operação real.

## Hypothesis

Em operação real, Store Owner, Manager ou Operator precisa responder com frequência suficiente as perguntas acima, e a ausência dessas respostas causa dificuldade concreta de suporte, operação ou confiança — o bastante para justificar migration e atomicidade em todos os writers de status.

## Evidence currently available

**Fatos:**

* produto em produção ativa; Online e Balcão operacionais;
* múltiplos roles podem alterar status;
* mutações conhecidas: create DIRECT, create COUNTER, `updateAdminOrderStatus`, finalize COUNTER;
* somente o estado atual (e `updatedAt`) é persistido para status;
* `createdByUserId` existe na criação COUNTER, não nas transições;
* não há model de eventos / timeline;
* live refresh não substitui auditoria.

**Não há (não inventar):**

* incidentes já ocorridos;
* perdas financeiras ou disputas;
* quantidade de alterações incorretas;
* exigência regulatória ou fiscal;
* SLA;
* pedido explícito do cliente por histórico.

## Evidence still missing

* caso concreto em que a ausência de histórico bloqueou investigação;
* dúvida real sobre autoria de cancelamento ou conclusão;
* necessidade recorrente de saber quando uma etapa ocorreu;
* priorização explícita do Store Owner sobre outras features;
* workaround manual relevante usado pelo suporte/operação.

## Observation method

| | |
| --- | --- |
| Duração | **7–14 dias**, ou **1 entrevista estruturada** com o Store Owner se disponível antes |
| Responsáveis | Product Engineer + Store Owner |
| Método | Observar/registrar ocorrências reais **ou** conduzir as perguntas abaixo |
| PII | Não registrar dados pessoais desnecessários; preferir código do pedido ou descrição anonimizada |

```text
necessidade observada
→ registrar caso concreto
→ novo product-grill (proposta reduzida)
→ BUILD ou DEFER
```

## Interview questions

1. Nesta semana, precisou saber quem mudou o status de algum pedido?
2. Precisou saber quando um pedido entrou em preparo ou ficou pronto?
3. Já houve dúvida sobre quem cancelou ou concluiu?
4. Como resolveu essa dúvida hoje?
5. A falta dessa informação atrapalhou atendimento, cozinha ou suporte?
6. Uma timeline apenas com criação e mudança de status seria suficiente?
7. Essa melhoria é mais importante que outras necessidades atuais?
8. Quem deveria poder visualizar esse histórico?
9. Pedidos antigos sem histórico seriam aceitáveis? *(risco de escopo / expectativa — não autoriza backfill)*
10. Existe necessidade de comentários, pagamento, IP ou outras informações? *(detectar expansão — não autoriza essas features)*

## Occurrence log

Registrar somente ocorrências reais:

| Date | Order / situation (anon.) | Question that arose | Who asked | Workaround used | Impact | Would a timeline help? |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

*(vazio até a janela de observação)*

## Re-grill criteria

Reabrir `product-grill` **somente** se existir pelo menos uma destas evidências:

* caso concreto em que a ausência de histórico bloqueou uma investigação;
* dúvida real sobre autoria de cancelamento ou conclusão;
* necessidade recorrente de saber quando uma etapa ocorreu;
* Store Owner prioriza explicitamente a timeline sobre outras features;
* suporte operacional utiliza um workaround manual relevante.

**Sem nenhuma ocorrência concreta na janela → Decision: DEFER**

Registrar então: ausência de demanda observada; condição para reabertura; nenhuma migration; nenhuma infraestrutura antecipada.

## Reduced proposal if validated

Usar **apenas** esta proposta no próximo grill (ainda não autorizada):

```text
ORDER_CREATED
STATUS_CHANGED
fromStatus
toStatus
actorUserId opcional
createdAt
timeline somente no detalhe admin
gate orders.read
mesma transação da mutação
sem backfill
sem metadata Json
sem event sourcing
```

Não planejar arquitetura até o novo grill resultar em **BUILD**.

## Decision after observation

```text
Pending
```

| Resultado possível | Quando |
| --- | --- |
| Novo grill → **BUILD** | Evidência positiva + grill da proposta reduzida aprova |
| **DEFER** | Nenhuma ocorrência concreta / sem priorização |
| Permanecer **VALIDATE** | Evidência ambígua — estender observação com critério explícito |
