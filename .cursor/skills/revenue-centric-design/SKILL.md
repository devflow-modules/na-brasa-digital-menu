---
name: revenue-centric-design
description: >-
  Conecta decisões de UI/UX e operação a comportamento comercial ou operacional
  observável (ativação, conversão, abandono, tempo, erros, ticket, retenção,
  confiança, acessibilidade, disposição a pagar). Use ao desenhar ou alterar
  telas, fluxos de storefront, checkout, handoff WhatsApp ou painel admin.
  Exige hipótese, métrica e menor alteração possível. Não autoriza dark patterns.
---

# Revenue-Centric Design

Conectar UI/UX a comportamento **observável**. “Receita” aqui não é só venda
direta: inclui ativação, conversão, abandono, tempo operacional, redução de
erros, ticket, retenção, confiança, acessibilidade e disposição a pagar.

## Pré-condição

Usar **somente depois** de `product-grill` com decisão **BUILD**.

Consumir do grill (não reabrir descoberta):

- problema já aprovado
- hipótese
- classificação PLATFORM | TENANT | CLIENT_SPECIFIC
- decisão BUILD

Esta skill **não substitui** o grill.
`REDUCE SCOPE` do grill **não** autoriza esta skill até existir novo grill com BUILD.

Não criar analytics complexo, tracking nem dashboard nesta fase do piloto.
Ver `docs/product/pilot-validation-plan.md`.

## Entradas esperadas

- tela ou fluxo
- público (cliente, equipe da loja, master)
- objetivo primário
- etapa do funil
- comportamento atual
- comportamento desejado
- restrições
- evidência disponível
- saída BUILD do product-grill

## Perguntas obrigatórias

### Objetivo da tela / fluxo

- Qual é a única ação principal?
- O que o usuário deve entender imediatamente?
- Qual decisão ele precisa tomar?
- Qual informação pode ser removida?

### Funil

Classificar em uma etapa:

- aquisição
- ativação
- seleção
- carrinho
- checkout
- handoff
- operação
- retenção

### Conversão e fricção

- Onde o usuário pode abandonar?
- O CTA descreve o que realmente acontece?
- Existe ambiguidade, ansiedade, informação tardia, campo desnecessário, distração ou duplicação?

### Operação

- A mudança reduz trabalho da loja, erro ou tempo de confirmação?
- Facilita conciliação painel ↔ WhatsApp?
- Cria nova carga operacional?

### Métrica

Exigir pelo menos uma métrica observável e declarar se será medida manualmente.

Exemplos: adição ao carrinho, início de checkout, criação de pedido, clique no
WhatsApp, confirmação da loja, conclusão, abandono, tempo entre estados, erro
de validação, tempo operacional, ticket médio.

Pergunta obrigatória: **Como saberemos que a mudança funcionou?**

## Saída obrigatória

1. **Objetivo da tela / fluxo**
2. **Comportamento atual**
3. **Comportamento desejado**
4. **Principal fricção**
5. **Hipótese** (alinhada ao BUILD do grill)
6. **Métrica primária**
7. **Métricas de proteção**
8. **Menor alteração possível**
9. **Risco de regressão**
10. **Como validar**
11. **Validation owner**
12. **Observation window**
13. **Success criterion**
14. **Adjustment criterion**
15. **Rollback or stop criterion**

## Distinções críticas

- `order_created` ≠ mensagem enviada no WhatsApp
- `whatsapp_handoff_clicked` ≠ mensagem enviada
- Clique ≠ conclusão real do pedido pela loja
- Pedido no painel sem mensagem é o maior risco do piloto

## Guardrails

- Não usar dark patterns
- Não esconder preço, taxa ou condição
- Não aumentar conversão por ambiguidade
- Preservar acessibilidade, segurança e clareza
- Evitar campos e etapas desnecessárias
- Não criar analytics complexo sem necessidade
- Não confundir clique com conclusão real
- Diferenciar pedido criado de mensagem enviada
- Não repetir integralmente o product-grill
