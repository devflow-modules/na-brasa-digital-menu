# Workspace de gerenciamento do cardápio

Feature TENANT: recomposição da UI de `/admin/cardapio` para progressive disclosure.

## Status

```text
BUILD
Classification: TENANT
Lote 1: accordion + rows compactas + busca/filtros + editor sob demanda
Sem drawer / duplicar / delete / mudança de actions
```

## Product Decision

```md
## Product Decision

- Problem: O cardápio admin era um formulário contínuo com todos os ProductForm montados.
- Evidence: Revisão de UI + código; scroll e localização degradam com o crescimento do cardápio.
- Hypothesis: Accordion + linhas compactas + edição sob demanda + busca reduzem tempo de localização sem mudar regras.
- Expected behavior: STORE_OWNER/MANAGER navega categorias recolhidas, edita um produto por vez e filtra por nome/status.
- Primary metric: Localizar e editar um produto em ≤ 30s no cardápio piloto.
- Guardrail metrics: Zero mudança em Prisma/actions/permissões; toggles active/available intactos; cardápio público intacto.
- Classification: TENANT
- Decision: BUILD (Lote 1)
- Rationale: Dor estrutural; menor fatia é só UI sobre o mesmo catálogo e mutations.
- Smallest implementation: MenuManagementWorkspace client + filters puros + E2E.
- Validation owner: Product Engineer + Store Owner
- Observation window: 7–14 dias após deploy
```

## Guardrails

Não alterar neste lote: `getAdminMenuCatalog`, schema Prisma, as 6 server actions, permissões, regras `active`/`available`, ordenação persistida, cardápio público.
