# `.cursor` — operação do Na Brasa

Documentação operacional para agentes e humanos no Cursor. Orienta **como** construir o cardápio online do Na Brasa, sem substituir o código nem o produto.

## Propósito

- Alinhar escopo MVP e decisões da V1
- Reduzir overengineering e PRs gigantes
- Reutilizar papéis (agents), regras (rules), fluxos (workflows) e prompts (commands)

## Fonte da verdade

| Fonte | Uso |
| --- | --- |
| `docs/product.md` | Problema, personas, fluxo, fora de escopo |
| `README.md` | Setup, scripts, roadmap |
| `.env.example` | Variáveis de ambiente |
| `.cursor/rules/` | Convenções obrigatórias / contextuais |
| `.cursor/AGENTS.md` | Índice de papéis lógicos |
| Código em `src/` e `prisma/` | Implementação real |

Se houver conflito: **produto/docs > rules > preferência do agente**.

## Como usar

### Rules (`.cursor/rules/`)

Regras `.mdc` com frontmatter. As com `alwaysApply: true` valem em toda sessão. As demais entram por contexto (frontend, backend, banco, etc.).

### Agents (`.cursor/agents/`)

Papéis lógicos para planejar, implementar ou revisar. Não são automações mágicas: escolha o papel (ou peça para “atuar como X”) conforme a tarefa.

### Workflows (`.cursor/workflows/`)

Sequências recomendadas: feature, bugfix, release, checagem de produção.

### Commands (`.cursor/commands/`)

Prompts reutilizáveis. Cole no chat ou referencie o arquivo ao pedir uma tarefa.

### Playwright MCP (opcional, local)

Para automação de browser assistida no Cursor, veja o exemplo em `mcp.playwright.example.json` e o guia em `docs/testing.md`.

Não é obrigatório para `pnpm build` nem para a suíte `pnpm test:e2e`.

## PRs pequenas

1. Uma intenção por PR (feature, fix ou docs — não misturar)
2. Planejar com `commands/plan-feature.md` antes de codar features maiores
3. Validar (`lint`, `typecheck`, `build`) antes de commit
4. Reportar arquivos, escopo e o que ficou de fora

## Evitar overengineering

- V1 = Next.js fullstack, WhatsApp por link, sem pagamento online, sem iFood, sem React Native
- Preferir código direto em `features/`, `lib/`, `server/` a frameworks internos
- Não criar abstrações “para o futuro” sem uso imediato
- Cortar escopo com o olhar de Product Owner quando a feature crescer demais
