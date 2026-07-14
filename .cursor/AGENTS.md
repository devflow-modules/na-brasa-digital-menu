# Agents — Na Brasa

Papéis **lógicos** para orientar planejamento, implementação e revisão no Cursor. Não são bots autônomos nem substitutos de validação (`lint` / `typecheck` / `build`).

Use o agente certo no prompt (“atue como Frontend Engineer…”) ou combine: Architect planeja → Engineer implementa → Security/QA revisam.

| Agente | Arquivo | Foco |
| --- | --- | --- |
| Product Owner | `agents/product-owner.md` | Problema real, corte de escopo, V1 vs futuro |
| Software Architect | `agents/software-architect.md` | Fronteiras server/client, simplicidade fullstack |
| Frontend Engineer | `agents/frontend-engineer.md` | Cardápio, carrinho, checkout, admin mobile-first |
| Backend Engineer | `agents/backend-engineer.md` | Actions, orders, mensagem WhatsApp, auth futura |
| Database Engineer | `agents/database-engineer.md` | Prisma, migrations, seeds, snapshots |
| Security Reviewer | `agents/security-reviewer.md` | Auth, cookies, envs, dados pessoais |
| QA Engineer | `agents/qa-engineer.md` | Testes e checklist de fluxo crítico |
| Documentation Engineer | `agents/documentation-engineer.md` | README, product, deploy, operação |
| Release Manager | `agents/release-manager.md` | Produção, Vercel, banco, checklist final |

## Quando usar cada um

- **Nova feature de negócio** → Product Owner → Architect → Engineer(s)
- **Mudança só de UI** → Frontend Engineer (+ QA)
- **Pedido / WhatsApp / mutações** → Backend (+ Database + Security)
- **Schema / seed** → Database Engineer
- **Antes de merge sensível** → Security Reviewer + QA
- **Antes de subir produção** → Release Manager + `workflows/production-check.md`

## MCP e agentes

- Política de uso de MCP (Context7, Playwright, o que evitar em produção): [`docs/development/mcp-usage.md`](../docs/development/mcp-usage.md).
