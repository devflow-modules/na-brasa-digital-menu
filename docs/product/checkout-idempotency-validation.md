# Checkout idempotency validation

Experimento de produto para a candidata **Idempotência server-side na criação de pedidos Online**.
Não autoriza implementação, alteração de contrato do checkout, schema Prisma, migration, Redis, TTL nem tabela genérica.

Relacionado: [../product.md](../product.md) · skill `.cursor/skills/product-grill`.

## Status

```text
BUILD (implemented — #105)
Classification: TENANT
Migration / contract change: DIRECT Online idempotency live on branch feat/online-order-idempotency-105
```

| Item | Classificação |
| --- | --- |
| Product-grill da proposta | **BUILD** (#105) |
| Idempotência server-side (`createOrder` DIRECT) | **Implementada** — `idempotencyKey` (UUID cliente) + fingerprint HMAC no servidor |
| Observação manual (abaixo) | **Opcional** — monitorar duplicações residuais pós-deploy |
| Decisão pós-observação | **Monitor** |

## Classification

```text
TENANT
```

A chave futura, se autorizada, deve ser isolada por Store (`storeId + key`). Colisão cross-tenant é inaceitável.

## Problem

O checkout Online usa `isPending` (e botão desabilitado) para reduzir submissões duplicadas no navegador, mas o servidor ainda trata cada request válida como uma nova criação de pedido `DIRECT`.

Retries, timeouts, duas abas ou requisições quase simultâneas podem, teoricamente, criar dois pedidos Online para a mesma intenção de compra.

Não existe incidente confirmado até o momento.

## Current mitigation

* Client: `isPending` / `useTransition` no formulário de checkout; submit desabilitado enquanto a action está em andamento.
* Server: cada payload válido cria um `Order` novo; `P2002` hoje só trata colisão de `Order.code`, não intenção de submit.
* Pós-sucesso: limpeza do carrinho e abertura/redirect para `wa.me`.

Essa mitigação reduz cliques duplicados no mesmo navegador; **não** é idempotência server-side.

## Hypothesis

Pedidos `DIRECT` duplicados por retry ou concorrência ocorrem com frequência suficiente para justificar:

* chave idempotente por intenção de submit;
* migration;
* constraint única (`storeId` + chave);
* hash canônico do payload no servidor;
* tratamento de concorrência (`P2002` / leitura do pedido existente).

A hipótese **ainda não está comprovada**.

## Evidence available

**Fatos:**

* produto em produção ativa; fluxo Online operacional;
* `isPending` existe no checkout;
* não há `idempotencyKey` no payload Zod nem no model `Order`;
* criação Online é mutação com efeito operacional (fila + WhatsApp);
* pedidos de Balcão (`COUNTER`) usam fluxo separado;
* não há gateway de pagamento nem conciliação nesta etapa.

**Não há (não inventar):**

* duplicações já ocorridas em produção;
* prejuízo financeiro documentado;
* volume alto de concorrência;
* retries automáticos confirmados;
* necessidade regulatória ou exatamente-once.

## Evidence missing

* pelo menos uma **duplicação confirmada** (mesma intenção → dois pedidos persistidos);
* ou vários **candidatos fortes** após revisão manual + relato do operador;
* contexto recorrente de timeout / “não abriu WhatsApp” / reenvio.

## Observation window

```text
14 dias corridos
```

Reabrir imediatamente o `product-grill` se uma duplicação for confirmada antes do término.

| | |
| --- | --- |
| Responsáveis | Product Engineer + Store Operator |
| Início | registrar a data de início no log abaixo |
| Ambiente | produção do piloto (consulta **read-only**) |

## Detection method

### 1. Busca read-only (triagem)

Periodicamente, procurar **pares candidatos** de pedidos com:

* mesma Store;
* `source = DIRECT`;
* telefone normalizado igual;
* total (`totalCents`) igual;
* `createdAt` com intervalo ≤ 60 segundos.

A consulta serve **somente para triagem**.

```text
telefone + total + Δ ≤ 60s
→ candidato para revisão
≠ duplicação confirmada
```

Não marcar automaticamente um par como duplicado.
Não alterar o banco.
Não criar tabela de observação.
Não adicionar analytics.

### 2. Revisão manual (obrigatória)

Para cada par candidato, comparar:

* itens;
* quantidades;
* adicionais;
* modalidade (PICKUP / DELIVERY);
* endereço ou retirada;
* observações;
* total;
* diferença exata entre timestamps;
* códigos dos pedidos.

Evidência realmente forte:

```text
mesma intenção de compra
→ dois pedidos persistidos
```

### 3. Confirmação operacional

Ver perguntas ao operador abaixo. Sem confirmação operacional, preferir **Candidato forte** ou **Inconclusivo** — não **Duplicação confirmada**.

## Candidate review criteria

| Classificação | Significado |
| --- | --- |
| **Duplicação confirmada** | Mesma intenção de compra; dois pedidos persistidos; operador (ou evidência inequívoca) confirma |
| **Candidato forte** | Itens/modalidade/observação alinhados + janela curta; falta confirmação operacional ou há dúvida residual |
| **Falso positivo** | Duas compras legítimas (mesmo telefone/total) ou diferenças claras de intenção |
| **Inconclusivo** | Dados insuficientes ou relato ambíguo |

### Critérios de falso positivo (explícitos)

* mesmo telefone e total **não** provam duplicação;
* famílias / mesmo número podem realizar compras legítimas parecidas;
* um cliente pode fazer dois pedidos consecutivos intencionais;
* telefone pode estar formatado de maneiras diferentes (normalizar na triagem; não assumir identidade sem revisão);
* itens equivalentes ainda precisam de confirmação operacional;
* ausência de candidatos **não** prova risco zero.

## Operator confirmation questions

1. Os dois pedidos representavam a mesma compra?
2. O cliente disse que tentou novamente / clicou de novo?
3. Houve timeout ou falha ao abrir o WhatsApp?
4. Ambos chegaram a ser preparados?
5. Um dos pedidos foi cancelado como duplicado?

## Observation log

Privacidade: não incluir telefone completo, endereço nem payload. Preferir códigos dos pedidos, telefone mascarado (ex.: `****9999`), resumo anonimizado.

| Data | Pedido A | Pedido B | Intervalo | Telefone igual | Total igual | Itens equivalentes | Relato do operador | Classificação |
| ---- | -------- | -------- | --------: | -------------- | ----------- | ------------------ | ------------------ | ------------- |
| | | | | | | | | |

*(vazio até a janela de observação; registrar a data de início na primeira linha de nota se útil)*

## Re-grill criteria

Reabrir o `product-grill` se ocorrer:

```text
≥ 1 duplicação confirmada
```

ou:

```text
≥ 3 candidatos fortes em 14 dias
```

O novo grill deve começar pela **proposta reduzida** abaixo. Isso **não** autoriza implementação automática — o novo ciclo decide **BUILD** ou **DEFER**.

## Reduced proposal if validated

Somente após evidência positiva + novo grill com decisão BUILD:

```text
somente createOrder DIRECT
idempotencyKey por intenção de submit
campo nullable no Order
unicidade por storeId + idempotencyKey
hash calculado no servidor
retry idêntico retorna pedido original
payload divergente gera conflito
COUNTER fora
sem Redis
sem TTL
sem tabela genérica
```

Pedidos antigos / COUNTER permaneceriam com chave `null` (sem backfill), se essa proposta for aprovada no futuro.

## Defer criteria

Ao fim dos 14 dias:

```text
0 duplicações confirmadas
e
no máximo 1 candidato fraco
```

Resultado esperado:

```text
Decision: DEFER
```

Revisar novamente:

* em 60 dias;
* no próximo incidente;
* quando houver pagamento Online;
* se o volume crescer significativamente;
* se houver relatos recorrentes de timeout ou retry.

## Method limitations

* triagem por telefone + total + janela é heurística, não prova;
* falsos positivos e falsos negativos são possíveis;
* ausência de candidatos não elimina o risco de classe;
* este documento não substitui monitoramento de produção nem autoriza instrumentação nova.

## Security and privacy

* consulta somente **read-only**;
* não armazenar payload completo neste documento;
* não copiar endereço;
* mascarar telefone;
* não registrar PII em logs novos;
* não adicionar analytics / tracking;
* não alterar banco;
* não criar tabela de observação.

## Decision after observation

```text
Pending
```

---

## Product Decision (registro do grill)

- **Problem:** Proteção client-side não garante um único pedido Online por intenção de submit sob retry/concorrência.
- **Evidence:** `isPending` existe; sem chave server-side; sem incidente documentado; produção ativa.
- **Hypothesis:** Duplicações `DIRECT` ocorrem o bastante para justificar migration + unicidade + hash — ainda não comprovada.
- **Expected behavior (VALIDATE):** observar candidatos e confirmações por 14 dias; sem mudança de checkout.
- **Primary metric:** duplicações confirmadas e candidatos fortes (após revisão manual).
- **Guardrail metrics:** falsos positivos de compras legítimas próximas.
- **Classification:** TENANT.
- **Decision:** VALIDATE.
- **Rationale:** risco tecnicamente real ≠ problema comprovado no piloto; migration seria infraestrutura preventiva.
- **Smallest experiment:** triagem read-only + revisão manual + perguntas ao operador (14 dias).
- **Validation owner:** Product Engineer + Store Operator.
- **Observation window:** 14 dias corridos (re-grill antecipado se incidente).
- **Evidence that would change the decision:** ≥1 duplicação confirmada ou ≥3 candidatos fortes → novo grill; caso contrário → DEFER.
