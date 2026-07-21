# Exportação CSV do fechamento operacional

Feature TENANT: download CSV do relatório diário a partir do mesmo `DailyClosingReport` da tela.

Relacionado: [daily-closing-report.md](daily-closing-report.md) · [../product.md](../product.md)

## Status

```text
BUILD
Classification: TENANT
MVP: UTF-8 CSV download from DailyClosingReport
No Sheets / XLSX / WhatsApp API / new aggregation
```

## Product Decision

```md
## Product Decision

- Problem: O sócio/operador precisa levar o fechamento para planilha sem recontar pedidos.
- Evidence: Fechamento operacional em produção; Lote 1 E2E validou o DTO; pedido de exportação CSV antes de Sheets.
- Hypothesis: Serializar o mesmo DailyClosingReport em CSV reduz trabalho manual sem divergir da tela/WhatsApp.
- Expected behavior: STORE_OWNER/MANAGER clica em “Baixar CSV” e recebe arquivo com o filtro atual.
- Primary metric: Exportação usada no fluxo de fechamento sem planilha manual paralela.
- Guardrail metrics: Zero PII; CSV injection neutralizada; totais iguais à tela; sem segunda agregação.
- Classification: TENANT
- Decision: BUILD
- Rationale: DTO já validado; formatter puro + download client; menor risco que Sheets/API.
- Smallest implementation: formatDailyClosingCsv + botão Blob download + unit/E2E.
- Validation owner: Product Engineer + Store Owner
- Observation window: 7–14 dias após deploy
- Evidence that would change the decision: Excel rejeita encoding; necessidade de XLSX; pedido de Sheets sync.
```

## Contrato

| Item | Valor |
| --- | --- |
| Fonte | `DailyClosingReport` (sem nova query) |
| Encoding | UTF-8 com BOM |
| Delimitador | `;` |
| Quebra | `\r\n` |
| Dinheiro | decimal brasileiro (`19,90`) a partir de `*Cents` |
| Filename | `fechamento-operacional-{slug-loja}-{YYYY-MM-DD}.csv` |
| Permissão | `reports.read` (existente) |
| PII | ausente (mesmo DTO da tela) |

## Segurança

Textos que começam com `=`, `+`, `-`, `@`, tab ou CR são prefixados para não virar fórmula no Excel/Sheets.

## Fora desta entrega

Google Sheets, XLSX, ZIP, upload, histórico, WhatsApp API, migration, nova permissão.
