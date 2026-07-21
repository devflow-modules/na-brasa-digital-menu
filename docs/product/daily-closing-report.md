# Relatório diário de fechamento operacional

Feature TENANT: tela admin para consolidar o expediente e copiar um resumo para WhatsApp.

Relacionado: [../product.md](../product.md) · DEFER dos cards de `/admin`: [admin-daily-summary-validation.md](admin-daily-summary-validation.md) (preservado — esta feature **não** expande esses cards).

## Status

```text
BUILD
Classification: TENANT
MVP: dynamic operational closing report
Default window: 17:00–01:00 America/Sao_Paulo
Sharing: WhatsApp copy + wa.me link + CSV download (same DTO)
UI polish: compact empty state, conditional detail sections, unified actions, collapsed preview
No WhatsApp API / PDF / Sheets / immutable close / cash reconciliation
```

## UI polish (presentation only)

```text
Decision: BUILD
Classification: TENANT
Scope: layout/density only — no DTO, aggregation, WhatsApp/CSV contracts or permissions
```

- Zero concluded orders → single empty message; hide empty detail sections; keep export actions.
- Detail sections render only when their data is present (cancelled still shows when count > 0).
- Export actions share primary / secondary / tertiary visual language.
- WhatsApp message preview starts collapsed (`<details>`).
- Filters denser on desktop; total KPI emphasized; cancelled KPI alerts only when > 0.


## Product Decision

```md
## Product Decision

- Problem: No fim do expediente, o operador precisa montar e enviar ao sócio um resumo do dia (o que saiu, quantidades, pagamentos, totais).
- Evidence: Pedido explícito do cliente piloto com contrato funcional confirmado.
- Hypothesis: Uma tela de fechamento dinâmico por data/janela + texto copiável para WhatsApp reduz tempo/erro do reporte diário sem virar contabilidade.
- Expected behavior: STORE_OWNER/MANAGER abre `/admin/relatorios/fechamento`, ajusta data/horários se necessário, confere totais e copia o resumo para o WhatsApp do sócio.
- Primary metric: Store Owner consegue enviar o fechamento do dia ao sócio em ≤ 2 minutos, em ≥ 5 dias de operação, sem planilha externa.
- Guardrail metrics: Não apresentar como caixa conciliado ou receita fiscal; não expor PII; cancelados fora do faturamento; KITCHEN e OPERATOR sem acesso.
- Classification: TENANT
- Decision: BUILD
- Rationale: Dor operacional explícita; schema atual suporta agregação por snapshots/centavos; escopo mínimo testa valor sem infraestrutura contábil.
- Smallest experiment or implementation: Página admin + service de agregação + copy WhatsApp + permission `reports.read` + testes.
- Validation owner: Product Engineer + Store Owner (Na Braza)
- Observation window: 7–14 dias de uso real após deploy
- Evidence that would change the decision: Sócio exige PDF/imutabilidade; timezone/janela quebra confiança; operador abandona a tela e volta à planilha.
```

## Regras confirmadas (MVP)

| Regra | Valor |
| --- | --- |
| Faturamento | somente pedidos `COMPLETED` |
| Cancelados | seção separada; não entram no faturamento |
| Abertos | alerta; valores não entram no total |
| Pertencimento | janela que contém `Order.createdAt`; mudança de status não move o pedido |
| Timezone | `America/Sao_Paulo` |
| Janela padrão | `start=17:00`, `end=01:00` (fim no dia civil seguinte) |
| Intervalo | semiaberto `[início, fim)` |
| Canais | entrega / retirada / balcão (`DELIVERY`, `PICKUP`≠COUNTER, `COUNTER`) |
| Taxa de entrega | separada do subtotal de produtos |
| Produtos | nome (snapshot), quantidade, valor da linha (`OrderItem.totalCents`) |
| Pagamentos | `CASH` / `PIX` / `DEBIT_CARD` / `CREDIT_CARD` / legado `CARD` (só se houver valor) / não informado |
| Acesso | `reports.read` → `STORE_OWNER` e `MANAGER` |
| Mutabilidade | relatório dinâmico (pode mudar se um pedido for corrigido) |
| Compartilhamento | copiar resumo para WhatsApp |
| Fora do MVP | PDF, CSV, gráficos, “Fechar dia” imutável, conciliação, WhatsApp API |

### Janela operacional

Não parsear `Store.openingHours` (texto livre).

- `date` = dia operacional em que o expediente começou.
- Se `end <= start`, o encerramento é no dia civil seguinte.
- Exemplo: `date=2026-07-21&start=17:00&end=01:00` → `[2026-07-21 17:00, 2026-07-22 01:00)` em `America/Sao_Paulo`.
- Pedido criado às `00:20` de `22/07` nessa janela → fechamento operacional de `21/07`.
- Rejeitar: horários inválidos, `start === end`, janela > 24h.
- Campos editáveis na UI para dias excepcionais.

### Linguagem (obrigatória)

Usar:

```text
Fechamento operacional
Total vendido em pedidos concluídos
```

Não usar:

```text
Fechamento de caixa
Caixa conciliado
Resultado fiscal
```

Pedidos `DIRECT` concluídos **não** possuem necessariamente confirmação financeira equivalente a `paidAt` do balcão.

### Privacidade

A seção de cancelados e o resumo copiado **não** incluem nome, telefone, endereço nem observações do cliente.

## Superfície

- Rota: `/admin/relatorios/fechamento`
- Chrome: link “Relatórios” visível só com `reports.read`
- Cards de resumo no topo de `/admin`: **inalterados** (DEFER preservado)

## Fora de escopo (esta entrega)

Migration, PDF, CSV, gráficos, fechamento imutável, conciliação de caixa, integração WhatsApp Business API, liberação para `OPERATOR`/`KITCHEN`, parse de `openingHours`.
