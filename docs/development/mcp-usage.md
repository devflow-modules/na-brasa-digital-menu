# MCP — política de uso (Cursor)

O Na Brasa usa MCP como **acelerador** para consulta de documentação e validação em browser. **Não** substitui CI, migrations, segredos nem infraestrutura de produção.

Documentos relacionados: [Testing](testing.md) · [Operação](operations.md) · [Checklist de produção](production-checklist.md)

## Matriz tarefa → ferramenta

| Tarefa | Ferramenta principal | MCP? | Observação |
| --- | --- | ---: | --- |
| Docs Next / Prisma / Zod / Playwright | Context7 | Sim | Manter sempre |
| Debug visual `/na-brasa`, `/admin`, checkout | Playwright MCP | Sim | Smoke rápido pós-deploy |
| E2E completo | `pnpm test:e2e` | Não | CI (`e2e.yml`) é fonte da verdade |
| PR / checks | GitHub UI / `gh` | Opcional | GitHub MCP só se virar gargalo |
| Deploy produção | `pnpm dlx vercel --prod` | Não | CLI |
| Migration produção | `pnpm prisma migrate deploy` | Não | Revisão humana; nunca `migrate reset` em Neon compartilhado |
| Drift / reset | Humano + terminal | Não | Ex.: tabela extra `playing_with_neon` no Neon |
| Dados em produção | Prisma/SQL controlado | Evitar MCP | Queries pontuais e revisadas |
| Secrets / env Vercel | Painel / CLI autenticado | Não | Nunca expor `.env` ao MCP |
| Review de código | Cursor + rules | Parcial | Context7 para APIs/docs |
| Smoke pós-deploy | Playwright MCP + checklist | Sim | Não substitui E2E |
| Issues / PRs em volume | `gh` ou GitHub MCP | Opcional | |

## MCPs recomendados

### Context7

- **Uso:** documentação de Next.js, React, Prisma, Zod, Playwright (versão instalada no projeto).
- **Quando:** implementação, migrations, Server Actions, mudanças de API.

### Playwright MCP

- **Uso:** smoke local ou em produção, validação visual, fluxos por role (MANAGER, OPERATOR, KITCHEN).
- **Quando:** após deploy; regressão rápida de cardápio, adicionais, checkout.
- **Limite:** fluxos críticos permanecem em `tests/e2e`.

### cursor-app-control

- **Uso:** fluxos do IDE (projeto, automations, recursos).

## MCPs opcionais

### GitHub MCP

- PR review, triagem de issues, status de checks.
- **Alternativa aceitável:** `gh` e interface web do GitHub.

## Evitar MCP para

- escrita em banco de **produção**
- administração Neon
- `prisma migrate` / `migrate reset`
- deploy Vercel de produção
- gestão de segredos
- leitura de `.env` com credenciais reais
- ações destrutivas no banco

## Regras operacionais

1. **CI manda:** `quality.yml` e `e2e.yml` na `main`.
2. **Produção / Neon compartilhado:** só `pnpm prisma migrate deploy`; **nunca** `prisma migrate reset`.
3. **Segredos:** `.env` fora do git; envs de produção só no painel Vercel ou CLI autenticado.
4. **Smoke em produção** pode usar Playwright MCP; pedido, checkout e permissões devem continuar cobertos por E2E.
5. **Agentes** não devem automatizar migration/deploy/reset em produção sem revisão explícita do operador.

## Decisão do projeto (resumo)

| Manter | Considerar depois | Não conectar agora |
| --- | --- | --- |
| Context7 | GitHub MCP | Vercel MCP |
| Playwright MCP | | Neon MCP |
| cursor-app-control | | Postgres genérico em prod |
| | | Prisma migrate via MCP |
