---
name: product-grill
description: >-
  Gate de decisão de produto antes de planejamento técnico ou implementação.
  Use ao propor feature, melhoria de UI/UX, mudança operacional ou qualquer
  trabalho que não seja correção crítica de segurança/integridade. Produz
  BUILD, VALIDATE, REDUCE SCOPE, DEFER ou REJECT com hipótese, métrica e
  próximo passo. Evita pular de ideia para arquitetura sem evidência.
---

# Product Grill

Gate obrigatório **antes** de arquitetura e código. Impede saltar de uma ideia
direto para implementação.

Não substitui `docs/product.md` nem o plano de validação do piloto
(`docs/product/pilot-validation-plan.md`). Complementa o Product Owner.

## Quando usar

- Nova feature ou melhoria relevante
- Mudança de UI/UX ou fluxo operacional
- Pedido de “seria legal ter…”
- Antes de `commands/plan-feature.md` e do workflow de feature

## Exceções (não bloquear)

Registrar a exceção e seguir **sem** BUILD comercial:

- Correção crítica de segurança
- Integridade de dados / vulnerabilidade
- Regressão bloqueadora em produção

Essas exceções exigem validação técnica; não exigem experimento comercial.

## Entradas esperadas

- problema ou feature proposta
- usuário ou operador afetado
- contexto do produto (ler `docs/product.md`)
- evidência disponível
- estágio atual do piloto
- classificação PLATFORM, TENANT ou CLIENT_SPECIFIC

## Perguntas obrigatórias

### Problema

- Qual problema observado estamos tentando resolver?
- Quem relatou esse problema?
- Quando isso ocorreu?
- Qual é a frequência?
- Qual é o impacto?
- Existe evidência ou apenas hipótese?
- O que acontece se não construirmos?

### Usuário e comportamento

- Quem executa o comportamento afetado?
- Qual comportamento atual queremos mudar?
- Onde ocorre a fricção?
- Existe workaround manual?
- O usuário já tentou resolver isso de outra forma?

### Valor

- Isso economiza tempo?
- Reduz abandono?
- Aumenta conversão?
- Reduz erro operacional?
- Aumenta ticket?
- Aumenta retenção?
- Melhora confiança ou acessibilidade?
- O cliente pagaria especificamente por esse resultado?

### Escopo

- É PLATFORM, TENANT ou CLIENT_SPECIFIC?
- A solução precisa existir antes da próxima operação?
- Qual é a menor mudança que testa a hipótese?
- Pode ser validada manualmente?
- Pode ser resolvida por processo antes de código?
- Estamos construindo infraestrutura antes de comprovar necessidade?

### Evidência

- Quais dados sustentam a decisão?
- Qual feedback sustenta a decisão?
- Existe incidente, gravação, entrevista ou métrica?
- Que evidência falta?

## Decisões e artefatos

Somente **BUILD** autoriza arquitetura ou implementação.
`REDUCE SCOPE` **nunca** é BUILD implícito.

### BUILD

Há evidência suficiente e a mudança deve ser implementada agora.

**Produzir:**

- escopo autorizado
- hipótese
- métrica
- menor implementação
- responsável pela validação
- prazo de observação

**Permite** seguir para arquitetura (e `revenue-centric-design` se UI/UX/operação).

### VALIDATE

A hipótese é relevante, mas precisa ser testada antes de construir.

**Produzir experimento concreto:**

- hipótese
- público
- método
- evidência a coletar
- responsável
- prazo
- condição para voltar ao grill

**Não permite** seguir para arquitetura.

### REDUCE SCOPE

Há valor, mas a solução proposta é maior do que o necessário.

**Produzir:**

- partes removidas
- menor problema que permanecerá
- nova proposta
- razão do corte

**Em seguida, obrigatório:**

```text
REDUCE SCOPE
→ cortar explicitamente o escopo
→ reformular a proposta
→ executar o product-grill novamente
→ somente continuar se a nova decisão for BUILD
```

**Não permite:**

- seguir diretamente para arquitetura
- interpretar “escopo já reduzido” como BUILD implícito
- continuar implementação sem novo grill
- tratar REDUCE SCOPE como aprovação parcial

### DEFER

O problema existe, mas não é prioridade nesta fase.

**Produzir:**

- razão
- condição para reavaliação
- evidência necessária
- owner
- data ou evento de revisão

**Não permite** seguir.

### REJECT

Não há evidência, valor ou alinhamento suficiente.

**Produzir:**

- razão da rejeição
- evidência existente
- risco evitado
- evidência que poderia reabrir a discussão

**Não permite** seguir.

## Formato de saída (obrigatório)

Responder com:

1. **Problema**
2. **Evidência** (fato vs hipótese; declarar incerteza)
3. **Hipótese**
4. **Comportamento esperado**
5. **Métrica** (observável; não inventar se inexistente)
6. **Menor experimento** (ou menor implementação, se BUILD)
7. **Classificação** — PLATFORM | TENANT | CLIENT_SPECIFIC
8. **Decisão** — BUILD | VALIDATE | REDUCE SCOPE | DEFER | REJECT
9. **Justificativa**
10. **Artefato da decisão** (conforme seção acima)
11. **Responsável**
12. **Prazo de validação** (ou data/evento de revisão, se DEFER)
13. **Evidência que mudaria a decisão** (opcional, recomendado em DEFER/REJECT)

## Registro obrigatório

### No plano da feature

Incluir seção `## Product Decision` com a saída do grill (ver
`commands/plan-feature.md`).

### Na Pull Request

Incluir resumo `## Product Decision` no corpo da PR (ver
`workflows/feature-development.md` e `workflows/release.md`).

Não criar documento separado obrigatório para cada feature.

## Guardrails

- Evitar overengineering e arquitetura prematura
- Evitar feature por preferência estética
- Diferenciar evidência de opinião
- Considerar acessibilidade, segurança e confiança mesmo sem impacto direto em receita
- Não bloquear correções críticas de segurança ou integridade
- Não inventar métricas inexistentes
- Declarar incerteza
- Preferir processo/manual antes de infraestrutura analítica ou billing
- REDUCE SCOPE sempre reabre o grill; nunca pula para arquitetura
