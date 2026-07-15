# `.cursor` — operação do Na Brasa

Documentação operacional para agentes e humanos no Cursor. Orienta **como** construir o cardápio online do Na Brasa, sem substituir o código nem o produto.

## Propósito

- Alinhar escopo MVP e decisões da V1
- Reduzir overengineering e PRs gigantes
- Reutilizar papéis (agents), regras (rules), skills, fluxos (workflows) e prompts (commands)
- Exigir problema, evidência, hipótese e métrica antes de features relevantes

## Fonte da verdade

| Fonte | Uso |
| --- | --- |
| `docs/product.md` | Problema, personas, fluxo, fora de escopo |
| `docs/product/pilot-validation-plan.md` | Validação do piloto Na Braza |
| `README.md` | Setup, scripts, roadmap |
| `.env.example` | Variáveis de ambiente |
| `.cursor/rules/` | Convenções obrigatórias / contextuais |
| `.cursor/skills/` | Gates de produto (grill, revenue-centric design) |
| `.cursor/AGENTS.md` | Índice de papéis lógicos |
| Código em `src/` e `prisma/` | Implementação real |

Se houver conflito: **produto/docs > rules > preferência do agente**.

## Como usar

### Rules (`.cursor/rules/`)

Regras `.mdc` com frontmatter. As com `alwaysApply: true` valem em toda sessão. As demais entram por contexto (frontend, backend, banco, etc.).

### Agents (`.cursor/agents/`)

Papéis lógicos para planejar, implementar ou revisar. Não são automações mágicas: escolha o papel (ou peça para “atuar como X”) conforme a tarefa.

### Skills (`.cursor/skills/`)

| Skill | Uso |
| --- | --- |
| `product-grill` | Gate BUILD / VALIDATE / REDUCE SCOPE / DEFER / REJECT antes de planejar |
| `revenue-centric-design` | Hipótese + métrica para mudanças de UI/UX/operação (somente após BUILD) |

Nenhuma feature relevante deve começar sem `product-grill`.
`REDUCE SCOPE` → cortar → re-grill → só seguir com **BUILD**.
Registrar decisão em `## Product Decision` (plano + corpo da PR).
Ver `workflows/feature-development.md`.

### Workflows (`.cursor/workflows/`)

Sequências recomendadas: feature, bugfix, release, checagem de produção.

### Commands (`.cursor/commands/`)

Prompts reutilizáveis. Cole no chat ou referencie o arquivo ao pedir uma tarefa.
`plan-feature` exige product-grill antes de arquitetura.

### Playwright MCP (opcional, local)

Para automação de browser assistida no Cursor, veja o exemplo em `mcp.playwright.example.json` e o guia em `docs/testing.md`.

Não é obrigatório para `pnpm build` nem para a suíte `pnpm test:e2e`.

## PRs pequenas

1. Uma intenção por PR (feature, fix ou docs — não misturar)
2. Rodar `product-grill`; só planejar/codar se a decisão for BUILD (REDUCE SCOPE exige re-grill)
3. Planejar com `commands/plan-feature.md` e salvar `## Product Decision`
4. Validar (`lint`, `typecheck`, `build`) antes de commit
5. Reportar arquivos, escopo, hipótese/métrica; repetir resumo Product Decision na PR

## Evitar overengineering

- V1 = Next.js fullstack, WhatsApp por link, sem pagamento online, sem iFood, sem React Native
- Preferir código direto em `features/`, `lib/`, `server/` a frameworks internos
- Não criar abstrações “para o futuro” sem uso imediato
- Cortar escopo com o olhar de Product Owner quando a feature crescer demais
