# Compartilhamento WhatsApp do fechamento operacional

Feature TENANT: mensagem legível + link `wa.me` a partir do mesmo `DailyClosingReport` da tela.

Relacionado: [daily-closing-report.md](daily-closing-report.md) · [daily-closing-csv-export.md](daily-closing-csv-export.md) · [../product.md](../product.md)

## Status

```text
BUILD
Classification: TENANT
MVP: improved WhatsApp text + open wa.me link (no destination number)
No WhatsApp Cloud API / auto-send / templates / tracking
```

## Product Decision

```md
## Product Decision

- Problem: O copy atual funciona, mas a mensagem é densa e o operador ainda cola manualmente no WhatsApp.
- Evidence: Fechamento operacional e CSV já validados; pedido de compartilhamento melhorado sem API.
- Hypothesis: Texto com hierarquia visual + link wa.me sem número reduz fricção e mantém o mesmo contrato do clipboard.
- Expected behavior: STORE_OWNER/MANAGER usa “Copiar resumo” ou “Abrir no WhatsApp” com o mesmo texto do filtro atual.
- Primary metric: Fechamento enviado ao sócio em ≤ 2 minutos sem reeditar o texto.
- Guardrail metrics: Zero PII; copy === texto do link; sem envio automático; sem destinatário fixo; CSV sem regressão.
- Classification: TENANT
- Decision: BUILD
- Rationale: Reusa formatter puro + encodeURIComponent; menor risco que API Meta.
- Smallest implementation: formatDailyClosingWhatsapp + buildDailyClosingWhatsappUrl + link <a> + unit/E2E.
- Validation owner: Product Engineer + Store Owner
- Observation window: 7–14 dias após deploy
- Evidence that would change the decision: Sócio exige PDF/Sheets; necessidade de destinatário fixo; abandono do link wa.me.
```

## Contrato

| Item | Valor |
| --- | --- |
| Fonte | `DailyClosingReport` (sem nova query) |
| Texto | `formatDailyClosingWhatsapp(report)` |
| Link | `https://wa.me/?text=<encodeURIComponent(text)>` |
| Destinatário | nenhum (seletor do usuário) |
| Ações | Copiar resumo · Abrir no WhatsApp · Baixar CSV |
| Permissão | `reports.read` (inalterada) |

## Guardrails

- Sem WhatsApp Cloud API, webhook, token ou templates Meta
- Sem envio automático ou número obrigatório
- Sem tracking, encurtador ou persistência
- Sem alteração do CSV ou nova agregação financeira
