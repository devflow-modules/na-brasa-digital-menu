# Command — implement-feature

Use após um plano aprovado (ou escopo claramente pequeno).

```text
Atue como Frontend/Backend/Database Engineer conforme o plano.

Pré-condição:
- O plano contém "## Product Decision" com Decision: BUILD
  (ou Exception para segurança/integridade/regressão bloqueadora).
- Se a decisão anterior foi REDUCE SCOPE, deve existir um novo grill com BUILD
  registrado no plano. Sem BUILD, pare.
- Se houver UI/UX/operação, o plano deve incluir revenue-centric-design.

Consulte o plano existente; não reabra descoberta de produto sem motivo.

Implemente a feature seguindo:
- `.cursor/rules/*` (project, architecture, frontend/backend/database/security)
- Plano aprovado (não expandir escopo)
- PRs pequenas; código simples e tipado
- Pedido salvo antes do WhatsApp; preços recalculados no server

Antes de implementar, confirme no relatório (a partir do plano):
- hipótese em teste
- comportamento esperado
- métrica a observar
- menor mudança
- arquivos permitidos pelo plano
- validation owner

Ao final:
- Liste arquivos criados/alterados
- Rode (ou indique) pnpm lint, typecheck, build (+ E2E se aplicável)
- Cite o que ficou de fora de propósito
- Plano de observação (owner + prazo) e riscos remanescentes
- Lembrete: corpo da PR deve incluir resumo "## Product Decision"

Plano / feature:
{{COLAR_PLANO_OU_ESCOPO}}
```
